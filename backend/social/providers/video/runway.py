"""Runway Gen video provider."""

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


class RunwayVideoProvider(VideoProvider):
    API_BASE = "https://api.dev.runwayml.com/v1"

    @property
    def name(self) -> str:
        return "runway"

    def is_configured(self) -> bool:
        return bool(getattr(settings, "RUNWAY_API_KEY", ""))

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_RUNWAY_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_RUNWAY_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = getattr(settings, "RUNWAY_API_KEY", "")
        if not api_key:
            raise VideoProviderNotConfigured("RUNWAY_API_KEY is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"Runway credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False):
            consume_ledger_credits(self.name, cost) if remaining is not None else None
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                video_bytes=b"",
                remote_url="",
                credits_used=cost,
                metadata={"mock": True, "prompt": request.prompt[:200]},
            )

        # Text-to-video (Runway public API shape — may evolve).
        payload = {
            "promptText": request.prompt[:1000],
            "model": getattr(settings, "RUNWAY_MODEL", "gen4_turbo"),
            "ratio": "720:1280" if request.aspect_ratio == "9:16" else "1280:720",
            "duration": max(2, min(10, int(request.duration_seconds or 5))),
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "X-Runway-Version": getattr(settings, "RUNWAY_API_VERSION", "2024-11-06"),
        }
        try:
            created = http_json(
                f"{self.API_BASE}/text_to_video",
                method="POST",
                headers=headers,
                body=payload,
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "402" in msg or "credit" in msg or "quota" in msg:
                raise VideoCreditsExhausted(str(exc)) from exc
            raise

        task_id = created.get("id") or created.get("task_id") or ""
        if not task_id:
            raise RuntimeError(f"Runway did not return a task id: {created}")

        video_url = self._poll_task(task_id, headers)
        raw, ctype = http_bytes(video_url)
        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            video_bytes=raw,
            content_type=ctype.split(";")[0] if ctype else "video/mp4",
            remote_url=video_url,
            external_id=task_id,
            credits_used=cost,
        )

    def _poll_task(self, task_id: str, headers: dict) -> str:
        deadline = time.time() + int(getattr(settings, "VIDEO_PROVIDER_POLL_SECONDS", 120))
        while time.time() < deadline:
            status = http_json(f"{self.API_BASE}/tasks/{task_id}", headers=headers)
            state = (status.get("status") or status.get("state") or "").lower()
            if state in {"succeeded", "completed", "success"}:
                output = status.get("output") or status.get("artifacts") or []
                if isinstance(output, list) and output:
                    first = output[0]
                    if isinstance(first, str):
                        return first
                    if isinstance(first, dict):
                        return first.get("url") or first.get("uri") or ""
                url = status.get("output_url") or status.get("url") or ""
                if url:
                    return url
                raise RuntimeError(f"Runway task succeeded without URL: {status}")
            if state in {"failed", "cancelled", "error"}:
                raise RuntimeError(f"Runway task failed: {status}")
            time.sleep(2)
        raise RuntimeError("Runway task timed out")
