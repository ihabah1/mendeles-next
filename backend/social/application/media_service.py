"""Generate Instagram SVG creatives and store uploaded TikTok video blobs."""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from seo.application.site_url import resolve_site_url

from social.infrastructure.models import SocialCampaign


def _media_dir() -> Path:
    root = Path(settings.MEDIA_ROOT) / "social"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _public_url(relative: str) -> str:
    base = resolve_site_url(getattr(settings, "SITE_URL", "") or getattr(settings, "FRONTEND_URL", "")).rstrip("/")
    # Prefer backend public URL when available for Buffer asset fetch.
    backend = (getattr(settings, "BACKEND_PUBLIC_URL", "") or "").rstrip("/")
    origin = backend or base
    media = settings.MEDIA_URL.rstrip("/")
    return f"{origin}{media}/{relative.lstrip('/')}"


def _wrap_text(text: str, width: int = 28) -> list[str]:
    words = (text or "").split()
    if not words:
        return [""]
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if len(trial) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:6]


class MediaGenerationService:
    @staticmethod
    def create_instagram_image(campaign: SocialCampaign) -> str:
        """Create a square Instagram creative with campaign title + website link."""
        title = (campaign.title or campaign.main_idea or "Mendeles")[:120]
        url = (campaign.website_url or "https://mendeles.com").strip()
        cta = (campaign.cta or "Learn more")[:80]
        title_lines = _wrap_text(title, 26)

        text_svg = ""
        y = 360
        for line in title_lines:
            text_svg += (
                f'<text x="540" y="{y}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" fill="#ffffff">'
                f"{escape(line)}</text>"
            )
            y += 62

        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4C1D95"/>
      <stop offset="55%" stop-color="#6F42F5"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="900" cy="160" r="120" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="160" cy="920" r="180" fill="#ffffff" fill-opacity="0.06"/>
  <text x="540" y="180" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="34" font-weight="700" fill="#DDD6FE" letter-spacing="4">MENDELES</text>
  {text_svg}
  <rect x="190" y="780" width="700" height="88" rx="44" fill="#ffffff"/>
  <text x="540" y="836" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="28" font-weight="700" fill="#4C1D95">{escape(cta)}</text>
  <text x="540" y="940" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="26" fill="#E2E8F0">{escape(url)}</text>
</svg>
"""
        filename = f"{campaign.id}-instagram.svg"
        path = _media_dir() / filename
        path.write_text(svg, encoding="utf-8")
        url_public = _public_url(f"social/{filename}")
        campaign.instagram_image_url = url_public
        if "instagram" in (campaign.platforms or []) and not campaign.media_url:
            campaign.media_url = url_public
        campaign.save(update_fields=["instagram_image_url", "media_url", "updated_at"])
        return url_public

    @staticmethod
    def create_tiktok_creative(campaign: SocialCampaign) -> str:
        """Create a vertical TikTok creative (SVG) with title + website link for simulation/preview."""
        title = (campaign.title or campaign.main_idea or "Mendeles")[:120]
        url = (campaign.website_url or "https://mendeles.com").strip()
        cta = (campaign.cta or "Learn more")[:80]
        title_lines = _wrap_text(title, 22)

        text_svg = ""
        y = 720
        for line in title_lines:
            text_svg += (
                f'<text x="540" y="{y}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#ffffff">'
                f"{escape(line)}</text>"
            )
            y += 66

        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="45%" stop-color="#4C1D95"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <circle cx="900" cy="220" r="160" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="140" cy="1680" r="220" fill="#ffffff" fill-opacity="0.05"/>
  <text x="540" y="220" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="36" font-weight="700" fill="#DDD6FE" letter-spacing="6">MENDELES · TIKTOK</text>
  {text_svg}
  <rect x="190" y="1480" width="700" height="96" rx="48" fill="#ffffff"/>
  <text x="540" y="1542" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="30" font-weight="700" fill="#4C1D95">{escape(cta)}</text>
  <text x="540" y="1680" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="28" fill="#E2E8F0">{escape(url)}</text>
</svg>
"""
        filename = f"{campaign.id}-tiktok.svg"
        path = _media_dir() / filename
        path.write_text(svg, encoding="utf-8")
        url_public = _public_url(f"social/{filename}")
        campaign.tiktok_video_url = url_public
        if campaign.media_type == "video" or not campaign.media_url:
            campaign.media_url = url_public
        campaign.save(update_fields=["tiktok_video_url", "media_url", "updated_at"])
        return url_public

    @staticmethod
    def save_tiktok_video(campaign: SocialCampaign, *, data_url: str) -> str:
        """Persist a browser-generated WebM/MP4 data URL for TikTok simulation/publish."""
        match = re.match(r"^data:(video/[\w.+-]+);base64,(.+)$", data_url, re.DOTALL)
        if not match:
            raise ValueError("Invalid video data URL.")
        mime, b64 = match.group(1), match.group(2)
        ext = "webm" if "webm" in mime else "mp4" if "mp4" in mime else "bin"
        raw = base64.b64decode(b64)
        if len(raw) > 25 * 1024 * 1024:
            raise ValueError("Video file is too large (max 25MB).")
        filename = f"{campaign.id}-tiktok-{uuid.uuid4().hex[:8]}.{ext}"
        path = _media_dir() / filename
        path.write_bytes(raw)
        url_public = _public_url(f"social/{filename}")
        campaign.tiktok_video_url = url_public
        if campaign.media_type == "video":
            campaign.media_url = url_public
        campaign.save(update_fields=["tiktok_video_url", "media_url", "updated_at"])
        return url_public
