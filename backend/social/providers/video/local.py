"""Local zero-credit fallback — vertical SVG creative (always available)."""

from __future__ import annotations

from xml.sax.saxutils import escape

from social.providers.video.base import VideoGenerationRequest, VideoGenerationResult, VideoProvider


class LocalFallbackVideoProvider(VideoProvider):
    """Last-resort provider so Mendeles campaigns never hard-fail without a creative."""

    @property
    def name(self) -> str:
        return "local"

    def is_configured(self) -> bool:
        return True

    def cost_per_video(self) -> int:
        return 0

    def credits_remaining(self) -> int | None:
        return 10_000

    def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        title = (request.title or "Mendeles")[:120]
        cta = (request.cta or "Learn more")[:80]
        url = (request.website_url or "https://mendeles.com").strip()
        prompt_line = (request.prompt or "")[:90]
        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#4C1D95"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <text x="540" y="220" text-anchor="middle" font-family="Arial" font-size="34" fill="#DDD6FE"
        font-weight="700" letter-spacing="4">MENDELES · TIKTOK</text>
  <text x="540" y="820" text-anchor="middle" font-family="Arial" font-size="54" fill="#ffffff"
        font-weight="700">{escape(title)}</text>
  <text x="540" y="920" text-anchor="middle" font-family="Arial" font-size="28" fill="#E2E8F0"
        >{escape(prompt_line)}</text>
  <rect x="190" y="1480" width="700" height="96" rx="48" fill="#ffffff"/>
  <text x="540" y="1542" text-anchor="middle" font-family="Arial" font-size="30" fill="#4C1D95"
        font-weight="700">{escape(cta)}</text>
  <text x="540" y="1680" text-anchor="middle" font-family="Arial" font-size="28" fill="#E2E8F0"
        >{escape(url)}</text>
</svg>
"""
        return VideoGenerationResult(
            ok=True,
            provider=self.name,
            video_bytes=svg.encode("utf-8"),
            content_type="image/svg+xml",
            credits_used=0,
            metadata={"fallback": True},
        )
