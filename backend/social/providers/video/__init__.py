"""Credit-aware video provider failover orchestrator."""

from __future__ import annotations

import logging
from typing import Iterable

from django.conf import settings

from social.providers.video.base import (
    VideoCreditsExhausted,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoProvider,
    VideoProviderError,
    VideoProviderNotConfigured,
)
from social.providers.video.fal import FalVideoProvider
from social.providers.video.kling import KlingVideoProvider
from social.providers.video.local import LocalFallbackVideoProvider
from social.providers.video.ltx import LtxVideoProvider
from social.providers.video.runway import RunwayVideoProvider
from social.providers.video.veo import VeoVideoProvider

logger = logging.getLogger(__name__)

DEFAULT_ORDER = ("runway", "fal", "veo", "ltx", "kling", "local")

PROVIDER_CLASSES: dict[str, type[VideoProvider]] = {
    "runway": RunwayVideoProvider,
    "fal": FalVideoProvider,
    "veo": VeoVideoProvider,
    "ltx": LtxVideoProvider,
    "kling": KlingVideoProvider,
    "local": LocalFallbackVideoProvider,
}


def provider_order() -> list[str]:
    raw = getattr(settings, "VIDEO_PROVIDER_FAILOVER", "") or ",".join(DEFAULT_ORDER)
    names = [n.strip().lower() for n in raw.split(",") if n.strip()]
    # Always keep local last as safety net if not listed.
    if "local" not in names:
        names.append("local")
    return names


def build_providers(order: Iterable[str] | None = None) -> list[VideoProvider]:
    providers: list[VideoProvider] = []
    for name in order or provider_order():
        cls = PROVIDER_CLASSES.get(name)
        if not cls:
            continue
        providers.append(cls())
    return providers


class VideoProviderOrchestrator:
    """
    For each video:
      1. Walk providers in failover order
      2. Skip unconfigured / zero-credit vendors
      3. Try generate; on credits/error → next provider
    """

    def __init__(self, providers: list[VideoProvider] | None = None):
        self.providers = providers or build_providers()

    def status(self) -> list[dict]:
        return [p.credit_status().to_dict() for p in self.providers]

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        attempts: list[dict] = []
        last_error = "No video providers available"

        for provider in self.providers:
            status = provider.credit_status()
            if not status.available:
                attempts.append(
                    {
                        "provider": provider.name,
                        "skipped": True,
                        "reason": status.message,
                        "credits_remaining": status.credits_remaining,
                    }
                )
                continue
            try:
                result = provider.generate(request)
                if not result.ok:
                    raise VideoProviderError(result.error or f"{provider.name} returned ok=False")
                result.metadata = {
                    **(result.metadata or {}),
                    "failover_attempts": attempts,
                }
                logger.info("Video generated via %s (attempts=%s)", provider.name, len(attempts))
                return result
            except VideoProviderNotConfigured as exc:
                attempts.append({"provider": provider.name, "error": str(exc), "type": "not_configured"})
                last_error = str(exc)
            except VideoCreditsExhausted as exc:
                attempts.append({"provider": provider.name, "error": str(exc), "type": "credits"})
                last_error = str(exc)
                logger.warning("Video provider %s out of credits: %s", provider.name, exc)
            except Exception as exc:  # noqa: BLE001 — failover must continue
                attempts.append({"provider": provider.name, "error": str(exc), "type": "error"})
                last_error = str(exc)
                logger.warning("Video provider %s failed: %s", provider.name, exc)

        return VideoGenerationResult(
            ok=False,
            provider="",
            error=last_error,
            metadata={"failover_attempts": attempts},
        )


def get_video_orchestrator() -> VideoProviderOrchestrator:
    return VideoProviderOrchestrator()
