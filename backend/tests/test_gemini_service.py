import pytest

from ai_seo.application.gemini_service import GeminiError, GeminiService


def test_gemini_service_falls_back_after_timeout(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    settings.GEMINI_MODEL = "gemini-2.5-flash"
    calls = []

    def fake_generate(api_key, model, prompt):
        calls.append(model)
        if model == "gemini-2.5-flash":
            raise TimeoutError("The read operation timed out")
        return {"title": "ok", "blocks": []}

    monkeypatch.setattr(GeminiService, "_generate_json_with_model", fake_generate)

    result = GeminiService.generate_json("prompt")

    assert result["title"] == "ok"
    assert calls == ["gemini-2.5-flash", "gemini-2.5-flash-lite"]


def test_gemini_service_reports_all_timeout_failures(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    settings.GEMINI_MODEL = "gemini-2.5-flash"

    def fake_generate(api_key, model, prompt):
        raise TimeoutError("The read operation timed out")

    monkeypatch.setattr(GeminiService, "_generate_json_with_model", fake_generate)

    with pytest.raises(GeminiError) as exc:
        GeminiService.generate_json("prompt")

    assert "No Gemini model completed generateContent" in str(exc.value)
    assert "gemini-2.5-flash: timeout" in str(exc.value)


def test_gemini_generate_image_returns_bytes(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    settings.GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"

    def fake_image(api_key, model, prompt, *, aspect_ratio="1:1"):
        assert model == "gemini-2.5-flash-image"
        assert aspect_ratio == "1:1"
        return b"png-bytes", "image/png"

    monkeypatch.setattr(GeminiService, "_generate_image_with_model", fake_image)
    raw, mime = GeminiService.generate_image("Attractive Mendeles campaign ad")
    assert raw == b"png-bytes"
    assert mime == "image/png"
