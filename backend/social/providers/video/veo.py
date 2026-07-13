"""Google Veo video provider (Gemini / Vertex style)."""

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


class VeoVideoProvider(VideoProvider):
    @property
    def name(self) -> str:
        return "veo"

    def is_configured(self) -> bool:
        return bool(getattr(settings, "VEO_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", ""))

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_VEO_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_VEO_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def _api_key(self) -> str:
        return getattr(settings, "VEO_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = self._api_key()
        if not api_key:
            raise VideoProviderNotConfigured("VEO_API_KEY / GEMINI_API_KEY is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"Veo credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False) or not getattr(settings, "VEO_API_KEY", ""):
            # Until Veo long-running predict is fully wired, mock/ledger path keeps failover working.
            if remaining is not None:
                consume_ledger_credits(self.name, cost)
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                credits_used=cost,
                metadata={
                    "mock": True,
                    "note": "Veo adapter ready — set VEO_API_KEY and disable VIDEO_PROVIDERS_MOCK for live calls",
                    "prompt": request.prompt[:200],
                },
            )

        model = getattr(settings, "VEO_MODEL", "veo-2.0-generate-001")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning"
            f"?key={api_key}"
        )
        try:
            created = http_json(
                url,
                method="POST",
                body={
                    "instances": [{"prompt": request.prompt[:1500]}],
                    "parameters": {
                        "aspectRatio": "9:16" if request.aspect_ratio == "9:16" else "16:9",
                        "sampleCount": 1,
                    },
                },
            )
        except Exception as exc:
            msg = str(exc).lower()
            if "429" in msg or "resource_exhausted" in msg or "quota" in msg:
                raise VideoCreditsExhausted(str(exc)) from exc
            raise

        op = created.get("name") or created.get("operation") or ""
        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            external_id=op,
            credits_used=cost,
            metadata={"operation": created},
            remote_url="",
        )
