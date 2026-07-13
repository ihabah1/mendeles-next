"""Generate campaign creatives (AI image + SVG fallback) and TikTok video blobs."""

from __future__ import annotations

import base64
import logging
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from django.db import connection

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
    title = campaign.title or campaign.main_idea or "Grow leads on autopilot"
    idea = campaign.main_idea or campaign.goal or "AI campaigns for Instagram, LinkedIn & TikTok"
    cta = campaign.cta or "Start free"
    url = (campaign.website_url or "https://mendeles.com").strip().replace("https://", "").replace("http://", "")
    media_prompt = (campaign.media_prompt or "").strip()
    base = media_prompt or (
        "Premium Mendeles AI growth campaign ad. Dark cinematic desk scene with a glowing laptop "
        "showing an analytics overview dashboard (leads, campaigns, conversion), violet neon geometry, "
        "coffee cup, notebook — polished SaaS product photography."
    )
    return (
        f"{base}\n\n"
        "Create one finished square 1:1 Instagram marketing creative.\n"
        "Must include readable on-image copy:\n"
        f"- Top brand wordmark: MENDELES\n"
        f"- Large headline: {title}\n"
        f"- Supporting line: {idea}\n"
        f"- White rounded CTA pill: {cta}\n"
        f"- Footer website: {url}\n"
        "Look: dark premium SaaS, violet #6F42F5 accents, soft neon glow frame, high contrast, ad-ready.\n"
        "Forbidden: watermarks, other logos, purple-on-white templates, tiny illegible text, stickers, collage grids."
    )


class MediaGenerationService:
    @staticmethod
    def append_creative_log(campaign: SocialCampaign, message: str, *, level: str = "info") -> None:
        logs = list(campaign.creative_log_json or [])
        logs.append(
            {
                "at": datetime.now(timezone.utc).isoformat(),
                "level": level,
                "message": message,
            }
        )
        campaign.creative_log_json = logs[-200:]
        campaign.save(update_fields=["creative_log_json", "updated_at"])

    @staticmethod
    def set_creative_progress(campaign: SocialCampaign, percent: int) -> None:
        campaign.creative_progress = max(0, min(100, int(percent)))
        campaign.save(update_fields=["creative_progress", "updated_at"])

    @classmethod
    def start_ai_tiktok_async(cls, campaign: SocialCampaign, *, count: int = 1) -> None:
        """Run AI TikTok generation in a background thread (progress + log on campaign)."""
        campaign_id = campaign.id
        campaign.tiktok_generating = True
        campaign.creative_progress = 5
        campaign.save(update_fields=["tiktok_generating", "creative_progress", "updated_at"])

        def _run() -> None:
            try:
                fresh = SocialCampaign.objects.filter(pk=campaign_id, deleted_at__isnull=True).first()
                if not fresh:
                    return
                cls.generate_ai_tiktok_videos(fresh, count=count)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Async TikTok generation failed for %s", campaign_id)
                try:
                    fresh = SocialCampaign.objects.filter(pk=campaign_id).first()
                    if fresh:
                        cls.append_creative_log(fresh, f"Generation failed: {exc}", level="error")
                        fresh.tiktok_generating = False
                        fresh.creative_progress = 100
                        fresh.save(update_fields=["tiktok_generating", "creative_progress", "updated_at"])
                except Exception:
                    pass
            finally:
                connection.close()

        threading.Thread(target=_run, daemon=True).start()

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
        # Always attach the designed image as campaign media after Generate.
        campaign.media_url = url_public
        campaign.save(update_fields=["instagram_image_url", "media_url", "updated_at"])
        return url_public

    @classmethod
    def _create_instagram_svg(cls, campaign: SocialCampaign) -> str:
        """Premium designed square creative when Gemini image is unavailable."""
        title = (campaign.title or campaign.main_idea or "Grow leads on autopilot")[:110]
        url = (campaign.website_url or "https://mendeles.com").strip()
        url_display = url.replace("https://", "").replace("http://", "").rstrip("/")
        cta = (campaign.cta or "Start free")[:72]
        subtitle = (campaign.main_idea or campaign.goal or "AI campaigns for Instagram, LinkedIn & TikTok")[:150]
        title_lines = _wrap_text(title, 22)
        sub_lines = _wrap_text(subtitle, 34)[:2]

        # Vertically balance headline block around center.
        block_h = len(title_lines) * 70 + len(sub_lines) * 38 + 24
        y = max(360, int(470 - block_h / 2))

        text_svg = ""
        for line in title_lines:
            text_svg += (
                f'<text x="540" y="{y}" text-anchor="middle" '
                f'font-family="Georgia, \'Times New Roman\', serif" font-size="58" font-weight="700" fill="#FFFFFF">'
                f"{escape(line)}</text>"
            )
            y += 70

        sub_svg = ""
        sy = y + 18
        for line in sub_lines:
            sub_svg += (
                f'<text x="540" y="{sy}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#DDD6FE">'
                f"{escape(line)}</text>"
            )
            sy += 38

        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0.15" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#0B1026"/>
      <stop offset="35%" stop-color="#2E1065"/>
      <stop offset="68%" stop-color="#6F42F5"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <radialGradient id="glowA" cx="22%" cy="18%" r="48%">
      <stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#C4B5FD" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="82%" cy="78%" r="42%">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F5F3FF"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#glowA)"/>
  <rect width="1080" height="1080" fill="url(#glowB)"/>
  <polygon points="540,-40 1180,420 980,520 540,140" fill="url(#ray)" opacity="0.9"/>
  <polygon points="-80,200 520,780 360,860 -80,360" fill="url(#ray)" opacity="0.45"/>
  <circle cx="900" cy="160" r="150" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="160" cy="940" r="210" fill="#A78BFA" fill-opacity="0.12" filter="url(#soft)"/>
  <rect x="64" y="64" width="952" height="952" rx="56" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="2"/>
  <rect x="88" y="88" width="904" height="904" rx="44" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1"/>
  <text x="540" y="188" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="34" font-weight="800" fill="#F8FAFC" letter-spacing="10">MENDELES</text>
  <text x="540" y="236" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="20" font-weight="600" fill="#C4B5FD" letter-spacing="5">AI GROWTH CAMPAIGN</text>
  <line x1="430" y1="268" x2="650" y2="268" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="2"/>
  {text_svg}
  {sub_svg}
  <rect x="250" y="820" width="580" height="96" rx="48" fill="url(#cta)"/>
  <text x="540" y="880" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="32" font-weight="800" fill="#4C1D95">{escape(cta)}</text>
  <text x="540" y="960" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-size="24" fill="#E2E8F0">{escape(url_display)}</text>
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
        # Keep designed campaign image as primary media when present.
        if not campaign.instagram_image_url and (campaign.media_type == "video" or not campaign.media_url):
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
        """Generate Mendeles TikTok creatives via VideoProvider failover with live progress log."""
        from social.domain.enums import CampaignStatus
        from social.providers.video import get_video_orchestrator
        from social.providers.video.base import VideoGenerationRequest

        count = max(1, min(int(count or 1), 20))
        orchestrator = get_video_orchestrator()
        cls.append_creative_log(
            campaign,
            f"Generating {count} TikTok video(s) — failover: {', '.join(p.name for p in orchestrator.providers)}",
        )
        cls.set_creative_progress(campaign, 10)

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
            pct = 10 + int(((index + 0.5) / count) * 80)
            cls.set_creative_progress(campaign, pct)
            cls.append_creative_log(campaign, f"Video {index + 1}/{count}: preparing prompt…")

            prompt = (
                f"{base_prompt}\n\n"
                f"Variation {index + 1}/{count} for Mendeles TikTok. "
                f"Vertical 9:16, high energy, brand Mendeles, CTA: {campaign.cta or 'Learn more'}, "
                f"website {campaign.website_url or 'https://mendeles.com'}."
            )
            cls.append_creative_log(campaign, f"Video {index + 1}/{count}: calling video providers…")

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

            for attempt in entry["failover_attempts"]:
                provider = attempt.get("provider") or "?"
                if attempt.get("skipped"):
                    cls.append_creative_log(
                        campaign,
                        f"Video {index + 1}: skipped {provider} — {attempt.get('reason') or attempt.get('error') or 'unavailable'}",
                        level="warn",
                    )
                elif attempt.get("error"):
                    cls.append_creative_log(
                        campaign,
                        f"Video {index + 1}: {provider} failed — {attempt.get('error')}",
                        level="warn",
                    )

            if not generation.ok:
                cls.append_creative_log(
                    campaign,
                    f"Video {index + 1}: all providers failed — {generation.error or 'unknown error'}",
                    level="error",
                )
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
                cls.append_creative_log(campaign, f"Video {index + 1}: empty response from provider", level="error")
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
            cls.append_creative_log(
                campaign,
                f"Video {index + 1}: ready via {entry['provider']} ({public})",
                level="success",
            )
            if campaign.media_type == "video" and not campaign.instagram_image_url:
                campaign.media_url = public
            elif not campaign.media_url:
                campaign.media_url = public

            cls.set_creative_progress(campaign, 10 + int(((index + 1) / count) * 85))

        ok_count = sum(1 for r in results if r.get("ok"))
        if ok_count == 0 and not campaign.tiktok_video_url:
            cls.append_creative_log(campaign, "No AI video produced — preview creative remains available", level="warn")

        campaign.tiktok_videos_json = videos
        campaign.tiktok_generating = False
        campaign.creative_progress = 100
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
                "tiktok_generating",
                "creative_progress",
                "updated_at",
            ]
        )
        cls.append_creative_log(campaign, f"Done — {ok_count}/{count} AI video(s) generated")
        return {
            "generated": ok_count,
            "failed": count - ok_count,
            "results": results,
            "providers": orchestrator.status(),
            "videos": videos,
        }
