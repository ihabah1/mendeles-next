"""LTX Studio / Lightricks video provider."""

from __future__ import annotations

from django.conf import settings

from social.providers.video.base import (
    VideoCreditsExhausted,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoProvider,
    VideoProviderNotConfigured,
)
from social.providers.video.http_utils import consume_ledger_credits, get_ledger_credits, http_json


class LtxVideoProvider(VideoProvider):
    @property
    def name(self) -> str:
        return "ltx"

    def is_configured(self) -> bool:
        return bool(getattr(settings, "LTX_API_KEY", ""))

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_LTX_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_LTX_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = getattr(settings, "LTX_API_KEY", "")
        if not api_key:
            raise VideoProviderNotConfigured("LTX_API_KEY is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"LTX credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False):
            if remaining is not None:
                consume_ledger_credits(self.name, cost)
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                credits_used=cost,
                metadata={"mock": True, "prompt": request.prompt[:200]},
            )

        base = getattr(settings, "LTX_API_BASE", "https://api.ltx.studio/v1").rstrip("/")
        try:
            created = http_json(
                f"{base}/videos/generate",
                method="POST",
                headers={"Authorization": f"Bearer {api_key}"},
                body={
                    "prompt": request.prompt[:1500],
                    "aspect_ratio": request.aspect_ratio or "9:16",
                    "duration": request.duration_seconds or 5,
                },
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "402" in msg or "credit" in msg or "quota" in msg:
                raise VideoCreditsExhausted(str(exc)) from exc
            raise

        video_url = created.get("url") or created.get("video_url") or ""
        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            remote_url=video_url,
            external_id=str(created.get("id") or ""),
            credits_used=cost,
            metadata=created if isinstance(created, dict) else {},
        )
