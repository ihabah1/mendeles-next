"""Gemini provider for real content generation."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from django.conf import settings


class GeminiError(RuntimeError):
    pass


class GeminiService:
    MODEL = "gemini-1.5-flash"

    @classmethod
    def configured(cls) -> bool:
        return bool(getattr(settings, "GEMINI_API_KEY", ""))

    @classmethod
    def generate_json(cls, prompt: str) -> dict:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise GeminiError("GEMINI_API_KEY is not configured.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cls.MODEL}:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.6,
                "responseMimeType": "application/json",
            },
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise GeminiError(f"Gemini API error {exc.code}: {detail[:500]}") from exc
        except Exception as exc:
            raise GeminiError(f"Gemini request failed: {exc}") from exc

        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as exc:
            raise GeminiError("Gemini returned an invalid JSON response.") from exc
