"""Gemini provider for real content generation."""

from __future__ import annotations

import base64
import json
import socket
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings


class GeminiError(RuntimeError):
    pass


class GeminiService:
    FALLBACK_MODELS = (
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    )
    IMAGE_FALLBACK_MODELS = (
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-preview-image-generation",
    )

    @classmethod
    def configured(cls) -> bool:
        return bool(getattr(settings, "GEMINI_API_KEY", ""))

    @classmethod
    def generate_json(cls, prompt: str) -> dict:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise GeminiError("GEMINI_API_KEY is not configured.")

        errors = []
        for model in cls._candidate_models():
            try:
                return cls._generate_json_with_model(api_key, model, prompt)
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="ignore")
                errors.append(f"{model}: {exc.code} {detail[:250]}")
                if exc.code != 404:
                    raise GeminiError(f"Gemini API error {exc.code} using {model}: {detail[:500]}") from exc
            except GeminiError:
                raise
            except Exception as exc:
                if cls._is_timeout_error(exc):
                    errors.append(f"{model}: timeout {exc}")
                    continue
                raise GeminiError(f"Gemini request failed using {model}: {exc}") from exc
        raise GeminiError("No Gemini model completed generateContent. Tried: " + " | ".join(errors))

    @classmethod
    def generate_image(cls, prompt: str, *, aspect_ratio: str = "1:1") -> tuple[bytes, str]:
        """Generate a campaign creative image. Returns (bytes, mime_type)."""
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise GeminiError("GEMINI_API_KEY is not configured.")

        errors: list[str] = []
        for model in cls._image_models():
            try:
                return cls._generate_image_with_model(api_key, model, prompt, aspect_ratio=aspect_ratio)
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="ignore")
                errors.append(f"{model}: {exc.code} {detail[:250]}")
                if exc.code not in (404, 400):
                    raise GeminiError(f"Gemini image error {exc.code} using {model}: {detail[:500]}") from exc
            except GeminiError as exc:
                errors.append(f"{model}: {exc}")
            except Exception as exc:
                if cls._is_timeout_error(exc):
                    errors.append(f"{model}: timeout {exc}")
                    continue
                raise GeminiError(f"Gemini image request failed using {model}: {exc}") from exc
        raise GeminiError("No Gemini image model completed. Tried: " + " | ".join(errors))

    @classmethod
    def _candidate_models(cls) -> list[str]:
        configured = getattr(settings, "GEMINI_MODEL", "")
        models = [configured] if configured else []
        models.extend(cls.FALLBACK_MODELS)
        return list(dict.fromkeys([m for m in models if m]))

    @classmethod
    def _image_models(cls) -> list[str]:
        configured = getattr(settings, "GEMINI_IMAGE_MODEL", "") or "gemini-2.5-flash-image"
        models = [configured]
        models.extend(cls.IMAGE_FALLBACK_MODELS)
        return list(dict.fromkeys([m for m in models if m]))

    @staticmethod
    def _is_timeout_error(exc: Exception) -> bool:
        if isinstance(exc, (TimeoutError, socket.timeout)):
            return True
        if isinstance(exc, urllib.error.URLError):
            return isinstance(exc.reason, (TimeoutError, socket.timeout))
        return "timed out" in str(exc).lower()

    @classmethod
    def _generate_json_with_model(cls, api_key: str, model: str, prompt: str) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.6,
                "maxOutputTokens": 2200,
                "responseMimeType": "application/json",
            },
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        timeout = int(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 25))
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as exc:
            raise GeminiError(f"Gemini returned an invalid JSON response using {model}.") from exc

    @classmethod
    def _generate_image_with_model(
        cls,
        api_key: str,
        model: str,
        prompt: str,
        *,
        aspect_ratio: str = "1:1",
    ) -> tuple[bytes, str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {"aspectRatio": aspect_ratio},
            },
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        timeout = int(getattr(settings, "GEMINI_IMAGE_TIMEOUT_SECONDS", 90))
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))

        parts = (((body.get("candidates") or [{}])[0].get("content") or {}).get("parts")) or []
        for part in parts:
            inline = part.get("inlineData") or part.get("inline_data") or {}
            data_b64 = inline.get("data")
            if not data_b64:
                continue
            raw = base64.b64decode(data_b64)
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            if raw:
                return raw, mime
        raise GeminiError(f"Gemini image model {model} returned no image bytes.")
