"""Fal.ai video provider."""

from __future__ import annotations

import time

from django.conf import settings

from social.providers.video.base import (
    VideoCreditsExhausted,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoProvider,
    VideoProviderNotConfigured,
)
from social.providers.video.http_utils import (
    consume_ledger_credits,
    get_ledger_credits,
    http_bytes,
    http_json,
)


class FalVideoProvider(VideoProvider):
    @property
    def name(self) -> str:
        return "fal"

    def is_configured(self) -> bool:
        return bool(getattr(settings, "FAL_KEY", "") or getattr(settings, "FAL_API_KEY", ""))

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_FAL_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_FAL_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def _api_key(self) -> str:
        return getattr(settings, "FAL_KEY", "") or getattr(settings, "FAL_API_KEY", "")

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = self._api_key()
        if not api_key:
            raise VideoProviderNotConfigured("FAL_KEY is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"Fal credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False):
            if remaining is not None:
                consume_ledger_credits(self.name, cost)
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                credits_used=cost,
                metadata={"mock": True, "prompt": request.prompt[:200]},
            )

        model = getattr(settings, "FAL_VIDEO_MODEL", "fal-ai/minimax/video-01-live")
        headers = {"Authorization": f"Key {api_key}"}
        try:
            queued = http_json(
                f"https://queue.fal.run/{model}",
                method="POST",
                headers=headers,
                body={
                    "prompt": request.prompt[:1500],
                    "aspect_ratio": request.aspect_ratio or "9:16",
                },
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "402" in msg or "credit" in msg or "quota" in msg or "billing" in msg:
                raise VideoCreditsExhausted(str(exc)) from exc
            raise

        status_url = queued.get("status_url") or ""
        response_url = queued.get("response_url") or ""
        request_id = queued.get("request_id") or ""
        if not status_url and request_id:
            status_url = f"https://queue.fal.run/{model}/requests/{request_id}/status"
            response_url = f"https://queue.fal.run/{model}/requests/{request_id}"

        video_url = self._poll(status_url, response_url, headers)
        raw, ctype = http_bytes(video_url)
        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            video_bytes=raw,
            content_type=ctype.split(";")[0] if ctype else "video/mp4",
            remote_url=video_url,
            external_id=request_id,
            credits_used=cost,
        )

    def _poll(self, status_url: str, response_url: str, headers: dict) -> str:
        if not status_url:
            raise RuntimeError("Fal queue response missing status_url")
        deadline = time.time() + int(getattr(settings, "VIDEO_PROVIDER_POLL_SECONDS", 120))
        while time.time() < deadline:
            status = http_json(status_url, headers=headers)
            state = (status.get("status") or "").upper()
            if state in {"COMPLETED", "OK"}:
                result = http_json(response_url, headers=headers) if response_url else status
                video = (
                    (result.get("video") or {}).get("url")
                    if isinstance(result.get("video"), dict)
                    else result.get("video_url") or result.get("url")
                )
                if not video and isinstance(result.get("output"), dict):
                    video = (result["output"].get("video") or {}).get("url")
                if not video:
                    raise RuntimeError(f"Fal completed without video URL: {result}")
                return video
            if state in {"FAILED", "ERROR", "CANCELLED"}:
                raise RuntimeError(f"Fal generation failed: {status}")
            time.sleep(2)
        raise RuntimeError("Fal generation timed out")
