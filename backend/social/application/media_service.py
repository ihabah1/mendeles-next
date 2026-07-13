"""Generate campaign creatives (AI image + SVG fallback) and TikTok video blobs."""

from __future__ import annotations

import base64
import logging
import re
import uuid
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings

from social.infrastructure.models import SocialCampaign

logger = logging.getLogger(__name__)


def _media_dir() -> Path:
    root = Path(settings.MEDIA_ROOT) / "social"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _public_url(relative: str) -> str:
    """
    Public media URL for creatives.
    Prefer BACKEND_PUBLIC_URL. Never point /media at the Next.js frontend host —
    that causes 404 on mendeles.com/media/...
    If backend public URL is missing, return a site-relative /media path (proxied by Next).
    """
    media = settings.MEDIA_URL.rstrip("/")
    path = f"{media}/{relative.lstrip('/')}"
    backend = (getattr(settings, "BACKEND_PUBLIC_URL", "") or "").rstrip("/")
    if backend:
        return f"{backend}{path}"
    return path


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


def _campaign_image_prompt(campaign: SocialCampaign) -> str:
    title = campaign.title or campaign.main_idea or "Mendeles growth campaign"
    idea = campaign.main_idea or campaign.goal or ""
    cta = campaign.cta or "Learn more"
    url = (campaign.website_url or "https://mendeles.com").strip()
    media_prompt = (campaign.media_prompt or "").strip()
    base = media_prompt or (
        f"Premium social ad creative for Mendeles AI growth platform. "
        f"Campaign: {title}. Idea: {idea}. CTA: {cta}."
    )
    return (
        f"{base}\n\n"
        "Create one square 1:1 Instagram marketing image, photorealistic-cinematic polish, "
        "high contrast, modern SaaS / AI product vibe, deep violet (#6F42F5) and slate accents, "
        "subtle glow, clean composition with room for headline energy. "
        f"Brand wordmark feel: Mendeles. Website vibe: {url}. "
        "No logos of other brands, no watermarks, no UI chrome, no tiny unreadable text, "
        "no purple-on-white generic template look. Attractive, scroll-stopping, ad-ready."
    )


class MediaGenerationService:
    @classmethod
    def create_instagram_image(cls, campaign: SocialCampaign) -> str:
        """Create an attractive square campaign image (Gemini AI, SVG fallback)."""
        try:
            from ai_seo.application.gemini_service import GeminiService

            if GeminiService.configured():
                raw, mime = GeminiService.generate_image(
                    _campaign_image_prompt(campaign),
                    aspect_ratio="1:1",
                )
                ext = "png"
                if "jpeg" in mime or "jpg" in mime:
                    ext = "jpg"
                elif "webp" in mime:
                    ext = "webp"
                filename = f"{campaign.id}-instagram-{uuid.uuid4().hex[:8]}.{ext}"
                path = _media_dir() / filename
                path.write_bytes(raw)
                url_public = _public_url(f"social/{filename}")
                return cls._persist_instagram_url(campaign, url_public)
        except Exception as exc:  # noqa: BLE001 — always fall back to designed SVG
            logger.warning("AI campaign image failed, using designed SVG: %s", exc)

        return cls._create_instagram_svg(campaign)

    @staticmethod
    def _persist_instagram_url(campaign: SocialCampaign, url_public: str) -> str:
        campaign.instagram_image_url = url_public
        if not campaign.media_url or "placehold.co" in (campaign.media_url or ""):
            campaign.media_url = url_public
        elif "instagram" in (campaign.platforms or []) and campaign.media_type != "video":
            campaign.media_url = url_public
        campaign.save(update_fields=["instagram_image_url", "media_url", "updated_at"])
        return url_public

    @classmethod
    def _create_instagram_svg(cls, campaign: SocialCampaign) -> str:
        """Attractive designed SVG fallback when Gemini image is unavailable."""
        title = (campaign.title or campaign.main_idea or "Mendeles")[:120]
        url = (campaign.website_url or "https://mendeles.com").strip()
        cta = (campaign.cta or "Learn more")[:80]
        subtitle = (campaign.main_idea or campaign.goal or "")[:140]
        title_lines = _wrap_text(title, 24)
        sub_lines = _wrap_text(subtitle, 36)[:2]

        text_svg = ""
        y = 420
        for line in title_lines:
            text_svg += (
                f'<text x="540" y="{y}" text-anchor="middle" '
                f'font-family="Georgia, \'Times New Roman\', serif" font-size="54" font-weight="700" fill="#ffffff">'
                f"{escape(line)}</text>"
            )
            y += 66

        sub_svg = ""
        sy = y + 28
        for line in sub_lines:
            sub_svg += (
                f'<text x="540" y="{sy}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#C4B5FD">'
                f"{escape(line)}</text>"
            )
            sy += 36

        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E1B4B"/>
      <stop offset="40%" stop-color="#5B21B6"/>
      <stop offset="75%" stop-color="#6F42F5"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#E9D5FF"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#glow)"/>
  <circle cx="920" cy="140" r="160" fill="#ffffff" fill-opacity="0.07"/>
  <circle cx="120" cy="980" r="220" fill="#22D3EE" fill-opacity="0.08"/>
  <rect x="72" y="72" width="936" height="936" rx="48" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <text x="540" y="200" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="28" font-weight="700" fill="#DDD6FE" letter-spacing="8">MENDELES</text>
  <text x="540" y="250" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="22" fill="#A5B4FC" letter-spacing="3">AI GROWTH CAMPAIGN</text>
  {text_svg}
  {sub_svg}
  <rect x="220" y="800" width="640" height="92" rx="46" fill="url(#bar)"/>
  <text x="540" y="858" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="30" font-weight="700" fill="#4C1D95">{escape(cta)}</text>
  <text x="540" y="960" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="24" fill="#E2E8F0">{escape(url)}</text>
</svg>
"""
        filename = f"{campaign.id}-instagram.svg"
        path = _media_dir() / filename
        path.write_text(svg, encoding="utf-8")
        return cls._persist_instagram_url(campaign, _public_url(f"social/{filename}"))

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

    @classmethod
    def generate_ai_tiktok_videos(cls, campaign: SocialCampaign, *, count: int = 1) -> dict:
        """Generate many Mendeles TikTok creatives via VideoProvider failover."""
        from social.domain.enums import CampaignStatus
        from social.providers.video import get_video_orchestrator
        from social.providers.video.base import VideoGenerationRequest

        count = max(1, min(int(count or 1), 20))
        orchestrator = get_video_orchestrator()
        base_prompt = (
            campaign.video_prompt
            or campaign.media_prompt
            or campaign.main_idea
            or campaign.goal
            or campaign.title
            or "Mendeles AI lead generation platform promo"
        )
        results: list[dict] = []
        videos = list(campaign.tiktok_videos_json or [])

        for index in range(count):
            prompt = (
                f"{base_prompt}\n\n"
                f"Variation {index + 1}/{count} for Mendeles TikTok. "
                f"Vertical 9:16, high energy, brand Mendeles, CTA: {campaign.cta or 'Learn more'}, "
                f"website {campaign.website_url or 'https://mendeles.com'}."
            )
            generation = orchestrator.generate(
                VideoGenerationRequest(
                    prompt=prompt,
                    title=campaign.title or "Mendeles",
                    cta=campaign.cta or "Learn more",
                    website_url=campaign.website_url or "https://mendeles.com",
                    aspect_ratio="9:16",
                    duration_seconds=5,
                    metadata={"campaign_id": str(campaign.id), "variation": index + 1},
                )
            )
            entry: dict = {
                "ok": generation.ok,
                "provider": generation.provider,
                "credits_used": generation.credits_used,
                "error": generation.error,
                "variation": index + 1,
                "failover_attempts": (generation.metadata or {}).get("failover_attempts") or [],
            }
            if not generation.ok:
                results.append(entry)
                continue

            if generation.video_bytes:
                ext = "svg" if "svg" in (generation.content_type or "") else "mp4"
                if "webm" in (generation.content_type or ""):
                    ext = "webm"
                filename = f"{campaign.id}-tiktok-ai-{uuid.uuid4().hex[:8]}.{ext}"
                path = _media_dir() / filename
                path.write_bytes(generation.video_bytes)
                public = _public_url(f"social/{filename}")
            elif generation.remote_url:
                public = generation.remote_url
            else:
                entry["ok"] = False
                entry["error"] = "Provider returned no video bytes or URL"
                results.append(entry)
                continue

            entry["url"] = public
            results.append(entry)
            videos.append(
                {
                    "url": public,
                    "provider": entry["provider"],
                    "variation": index + 1,
                    "credits_used": generation.credits_used,
                    "external_id": generation.external_id,
                }
            )
            campaign.tiktok_video_url = public
            if campaign.media_type == "video" or not campaign.media_url:
                campaign.media_url = public

        campaign.tiktok_videos_json = videos
        campaign.simulated_at = None
        if campaign.status == CampaignStatus.SIMULATED:
            campaign.status = CampaignStatus.READY
        campaign.save(
            update_fields=[
                "tiktok_video_url",
                "tiktok_videos_json",
                "media_url",
                "simulated_at",
                "status",
                "updated_at",
            ]
        )
        return {
            "generated": sum(1 for r in results if r.get("ok")),
            "failed": sum(1 for r in results if not r.get("ok")),
            "results": results,
            "providers": orchestrator.status(),
            "videos": videos,
        }
