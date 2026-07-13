"""Google Veo 3.1 video provider (Gemini API predictLongRunning)."""

from __future__ import annotations

import base64
import time
from typing import Any

from django.conf import settings

from social.providers.video.base import (
    VideoCreditsExhausted,
    VideoGenerationRequest,
    VideoGenerationResult,
    VideoProvider,
    VideoProviderNotConfigured,
)
from social.providers.video.http_utils import consume_ledger_credits, get_ledger_credits, http_bytes, http_json

# Official Gemini API model ids (user-facing aliases normalized below).
DEFAULT_VEO_MODEL = "veo-3.1-generate-preview"
_MODEL_ALIASES = {
    "veo-3.1-generate": "veo-3.1-generate-preview",
    "veo-3.1": "veo-3.1-generate-preview",
    "veo-3.1-generate-preview": "veo-3.1-generate-preview",
    "veo-3.1-fast-generate": "veo-3.1-fast-generate-preview",
    "veo-3.1-fast": "veo-3.1-fast-generate-preview",
    "veo-3.1-fast-generate-preview": "veo-3.1-fast-generate-preview",
}


def resolve_veo_model(raw: str | None = None) -> str:
    model = (raw or getattr(settings, "VEO_MODEL", "") or DEFAULT_VEO_MODEL).strip()
    return _MODEL_ALIASES.get(model, model)


def _extract_video_uri(status: dict[str, Any]) -> str:
    response = status.get("response") or {}
    if not isinstance(response, dict):
        return ""
    for key in ("generateVideoResponse", "generate_video_response"):
        block = response.get(key)
        if isinstance(block, dict):
            samples = block.get("generatedSamples") or block.get("generated_samples") or []
            if isinstance(samples, list) and samples:
                video = samples[0].get("video") if isinstance(samples[0], dict) else None
                if isinstance(video, dict):
                    return video.get("uri") or video.get("url") or ""
    return (
        response.get("video_url")
        or response.get("uri")
        or ""
    )


def _extract_video_bytes_b64(status: dict[str, Any]) -> bytes | None:
    response = status.get("response") or {}
    if not isinstance(response, dict):
        return None
    for key in ("generateVideoResponse", "generate_video_response"):
        block = response.get(key)
        if not isinstance(block, dict):
            continue
        samples = block.get("generatedSamples") or block.get("generated_samples") or []
        if not isinstance(samples, list) or not samples:
            continue
        video = samples[0].get("video") if isinstance(samples[0], dict) else None
        if not isinstance(video, dict):
            continue
        b64 = video.get("videoBytesBase64Encoded") or video.get("bytesBase64Encoded")
        if b64:
            return base64.b64decode(b64)
    return None


class VeoVideoProvider(VideoProvider):
    API_BASE = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def name(self) -> str:
        return "veo"

    def _api_key(self) -> str:
        return (getattr(settings, "VEO_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "") or "").strip()

    def is_configured(self) -> bool:
        return bool(self._api_key())

    def cost_per_video(self) -> int:
        return int(getattr(settings, "VIDEO_VEO_CREDIT_COST", 1) or 1)

    def credits_remaining(self) -> int | None:
        default = getattr(settings, "VIDEO_VEO_CREDITS", None)
        default_i = int(default) if default not in (None, "") else None
        return get_ledger_credits(self.name, default_i)

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        api_key = self._api_key()
        if not api_key:
            raise VideoProviderNotConfigured("VEO_API_KEY (or GEMINI_API_KEY) is not set")

        remaining = self.credits_remaining()
        cost = self.cost_per_video()
        if remaining is not None and remaining < cost:
            raise VideoCreditsExhausted(f"Veo credits exhausted ({remaining})")

        if getattr(settings, "VIDEO_PROVIDERS_MOCK", False):
            raise VideoProviderNotConfigured("Veo mock disabled — use a real video provider or local fallback")

        model = resolve_veo_model()
        headers = {"x-goog-api-key": api_key}
        try:
            created = http_json(
                f"{self.API_BASE}/models/{model}:predictLongRunning",
                method="POST",
                headers=headers,
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

        op = created.get("name") or ""
        if not op:
            raise RuntimeError(f"Veo did not return an operation name: {created}")

        status = self._poll_operation(op, headers)
        if status.get("error"):
            raise RuntimeError(f"Veo operation failed: {status.get('error')}")

        inline = _extract_video_bytes_b64(status)
        if inline:
            if remaining is not None:
                consume_ledger_credits(self.name, cost)
            return VideoGenerationResult(
                ok=True,
                provider=self.name,
                video_bytes=inline,
                content_type="video/mp4",
                external_id=op,
                credits_used=cost,
                metadata={"model": model, "operation": op},
            )

        video_uri = _extract_video_uri(status)
        if not video_uri:
            raise RuntimeError(f"Veo operation done but no video URI: {status}")

        raw, ctype = http_bytes(
            video_uri,
            headers=headers,
            timeout=max(60, int(getattr(settings, "VIDEO_PROVIDER_TIMEOUT_SECONDS", 60))),
        )
        if not raw:
            raise RuntimeError("Veo download returned empty bytes")

        if remaining is not None:
            consume_ledger_credits(self.name, cost)
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            video_bytes=raw,
            content_type=(ctype.split(";")[0] if ctype else "video/mp4"),
            remote_url=video_uri,
            external_id=op,
            credits_used=cost,
            metadata={"model": model, "operation": op},
        )

    def _poll_operation(self, operation_name: str, headers: dict[str, str]) -> dict[str, Any]:
        deadline = time.time() + int(getattr(settings, "VIDEO_PROVIDER_POLL_SECONDS", 300))
        url = f"{self.API_BASE}/{operation_name.lstrip('/')}"
        while time.time() < deadline:
            status = http_json(url, headers=headers)
            if status.get("done") is True:
                return status
            time.sleep(5)
        raise RuntimeError(f"Veo operation timed out: {operation_name}")
