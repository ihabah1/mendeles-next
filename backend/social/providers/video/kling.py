"""Kling AI video provider (when API credentials are available)."""

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


class KlingVideoProvider(VideoProvider):
    @property
    def name(self) -> str:
        return "kling"

    def is_configured(self) -> bool:
        return bool(getattr(settings, "KLING_API_KEY", "") and getattr(settings, "KLING_API_BASE", ""))

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_KLING_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_KLING_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = getattr(settings, "KLING_API_KEY", "")
        base = getattr(settings, "KLING_API_BASE", "").rstrip("/")
        if not api_key or not base:
            raise VideoProviderNotConfigured("KLING_API_KEY / KLING_API_BASE is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"Kling credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False):
            if remaining is not None:
                consume_ledger_credits(self.name, cost)
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                credits_used=cost,
                metadata={"mock": True, "prompt": request.prompt[:200]},
            )

        try:
            created = http_json(
                f"{base}/v1/videos/text2video",
                method="POST",
                headers={"Authorization": f"Bearer {api_key}"},
                body={
                    "prompt": request.prompt[:1500],
                    "aspect_ratio": request.aspect_ratio or "9:16",
                    "duration": str(request.duration_seconds or 5),
                },
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "402" in msg or "credit" in msg or "quota" in msg:
                raise VideoCreditsExhausted(str(exc)) from exc
            raise

        video_url = created.get("video_url") or created.get("url") or ""
        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            remote_url=video_url,
            external_id=str(created.get("task_id") or created.get("id") or ""),
            credits_used=cost,
            metadata=created if isinstance(created, dict) else {},
        )
