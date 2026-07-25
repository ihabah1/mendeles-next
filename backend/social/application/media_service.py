"""Generate campaign creatives (AI image + SVG fallback) and TikTok video blobs."""

from __future__ import annotations

import base64
import logging
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


def public_media_url_for_buffer(url: str) -> str:
    """
    Absolute URL Buffer can fetch from the public internet.
    Prefer the frontend /media proxy (FRONTEND_URL) so Buffer does not need
    to reach the private Railway API host.
    """
    from urllib.parse import urlparse

    raw = (url or "").strip()
    if not raw:
        return ""
    frontend = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    backend = (getattr(settings, "BACKEND_PUBLIC_URL", "") or "").rstrip("/")
    media_prefix = (settings.MEDIA_URL or "/media/").rstrip("/")

    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        path = parsed.path or ""
        query = f"?{parsed.query}" if parsed.query else ""
        # Any /media/... host → public frontend proxy (Buffer crawls the open web).
        if frontend and path.startswith("/media"):
            return f"{frontend}{path}{query}"
        if backend and frontend and raw.startswith(backend + media_prefix):
            return frontend + raw[len(backend) :]
        if backend and frontend and raw.startswith(backend + "/media"):
            return frontend + raw[len(backend) :]
        return raw

    path = raw if raw.startswith("/") else f"/{raw.lstrip('/')}"
    if frontend:
        return f"{frontend}{path}"
    if backend:
        return f"{backend}{path}"
    return path

def _buffer_placeholder_png(label: str) -> str:
    from urllib.parse import quote

    text = quote((label or "Mendeles")[:80])
    return f"https://placehold.co/1080x1080/6F42F5/ffffff/png?text={text}"


def is_real_raster_image_url(url: str) -> bool:
    """True for real PNG/JPEG/WebP/GIF — rejects SVG and placehold.co fillers."""
    raw = (url or "").strip()
    if not raw:
        return False
    lower = raw.lower()
    if "placehold.co" in lower:
        return False
    path = lower.split("?", 1)[0]
    if path.endswith(".svg"):
        return False
    return any(path.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"))


MISSING_PNG_MESSAGE = (
    "חסרה תמונת PNG לקמפיין. לחצו על Create Instagram image (חייבת להיות PNG, לא SVG), "
    "ואז הריצו סימולציה מחדש לפני שליחה. Placeholder לא נשלח ל-Buffer."
)


def ensure_buffer_image_url(campaign: SocialCampaign, *, allow_ai_regen: bool = False) -> str:
    """
    Return a Buffer-safe real raster image URL (not SVG / not placehold).
    During publish (allow_ai_regen=False) never call Gemini.
    Returns "" when no real creative exists — callers must block publish.
    """
    candidates = [
        getattr(campaign, "linkedin_image_url", "") or "",
        campaign.instagram_image_url,
        campaign.media_url,
    ]
    for candidate in candidates:
        url = public_media_url_for_buffer(candidate or "")
        if not is_real_raster_image_url(url):
            if url and str(url).lower().split("?", 1)[0].endswith(".svg"):
                logger.info(
                    "buffer_media_skip_svg campaign_id=%s url=%s",
                    campaign.id,
                    url[:180],
                )
            continue
        logger.info(
            "buffer_media_image campaign_id=%s url=%s",
            campaign.id,
            url[:180],
        )
        return url

    if allow_ai_regen:
        try:
            logger.info("buffer_media_regen_start campaign_id=%s", campaign.id)
            MediaGenerationService.create_instagram_image(campaign)
            campaign.refresh_from_db()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Buffer image regenerate failed campaign_id=%s: %s", campaign.id, exc)

        url = public_media_url_for_buffer(campaign.instagram_image_url or campaign.media_url or "")
        if is_real_raster_image_url(url):
            return url

    logger.warning(
        "buffer_media_missing_png campaign_id=%s ig=%s media=%s",
        campaign.id,
        (campaign.instagram_image_url or "")[:120],
        (campaign.media_url or "")[:120],
    )
    return ""


def _is_buffer_video_url(url: str) -> bool:
    public = public_media_url_for_buffer(url or "")
    lower = (public or "").lower().split("?", 1)[0]
    return bool(public and (lower.endswith(".mp4") or lower.endswith(".mov")))


def resolve_platform_image_url(campaign: SocialCampaign, platform: str) -> str:
    """Prefer platform-specific image, then shared Instagram/media fallbacks."""
    if platform == "linkedin":
        candidates = [
            getattr(campaign, "linkedin_image_url", "") or "",
            campaign.instagram_image_url,
            campaign.media_url,
        ]
    elif platform == "instagram":
        candidates = [campaign.instagram_image_url, campaign.media_url]
    else:
        candidates = [campaign.media_url, campaign.instagram_image_url]
    for candidate in candidates:
        url = public_media_url_for_buffer(candidate or "")
        if is_real_raster_image_url(url):
            return url
    return ""


def resolve_platform_video_url(campaign: SocialCampaign, platform: str) -> str:
    """Prefer platform-specific video, then shared TikTok/campaign video fallbacks."""
    if platform == "linkedin":
        candidates = [getattr(campaign, "linkedin_video_url", "") or ""]
    elif platform == "instagram":
        candidates = [
            getattr(campaign, "instagram_video_url", "") or "",
            campaign.tiktok_video_url,
        ]
        for item in campaign.tiktok_videos_json or []:
            if isinstance(item, dict) and item.get("url"):
                candidates.append(str(item["url"]))
    else:  # tiktok
        candidates = [campaign.tiktok_video_url]
        for item in campaign.tiktok_videos_json or []:
            if isinstance(item, dict) and item.get("url"):
                candidates.append(str(item["url"]))
    for candidate in candidates:
        if _is_buffer_video_url(candidate):
            return public_media_url_for_buffer(candidate)
    return ""


def ensure_buffer_video_url(campaign: SocialCampaign) -> str:
    """Return a public MP4/MOV URL for TikTok / shared campaign video (Buffer-safe)."""
    url = resolve_platform_video_url(campaign, "tiktok")
    if url:
        logger.info(
            "buffer_media_video campaign_id=%s url=%s",
            campaign.id,
            url[:180],
        )
        return url
    # Also accept Instagram-dedicated video as shared campaign video.
    ig = resolve_platform_video_url(campaign, "instagram")
    if ig:
        return ig
    logger.info("buffer_media_video_none campaign_id=%s", campaign.id)
    return ""
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
    def create_instagram_image(cls, campaign: SocialCampaign, *, require_ai: bool = False) -> str:
        """Create an attractive square campaign image (Gemini AI, SVG fallback)."""
        ai_error = "Gemini image generation is not configured."
        try:
            from ai_seo.application.gemini_service import GeminiService

            if GeminiService.configured(tenant_id=campaign.tenant_id):
                prompt = _campaign_image_prompt(campaign)
                if require_ai:
                    prompt += (
                        "\n\nCreate a genuinely fresh visual composition for this request. "
                        "Do not reuse a generic dashboard layout or a previous arrangement. "
                        f"Creative variation token: {uuid.uuid4().hex}."
                    )
                raw, mime = GeminiService.generate_image(
                    prompt,
                    tenant_id=campaign.tenant_id,
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
            if not GeminiService.enabled(campaign.tenant_id):
                ai_error = "Gemini AI is disabled by the system feature flag."
            else:
                ai_error = "Gemini image generation is not configured."
        except Exception as exc:  # noqa: BLE001 — always fall back to designed SVG
            ai_error = str(exc)
            logger.warning("AI campaign image failed, using designed SVG: %s", exc)

        if require_ai:
            raise ValueError(f"AI image generation failed: {ai_error}")
        return cls._create_instagram_svg(campaign)

    @classmethod
    def save_instagram_png(cls, campaign: SocialCampaign, *, data_url: str) -> str:
        """Persist a browser-rasterized PNG creative without relying on Gemini."""
        raw_url = (data_url or "").strip()
        marker = ";base64,"
        idx = raw_url.find(marker)
        if not raw_url.startswith("data:image/png") or idx < 0:
            raise ValueError("Invalid PNG data URL.")

        try:
            raw = base64.b64decode(raw_url[idx + len(marker) :], validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Invalid PNG base64 payload: {exc}") from exc

        if len(raw) < 64 or not raw.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Uploaded creative is not a valid PNG file.")
        if len(raw) > 12 * 1024 * 1024:
            raise ValueError("PNG creative is too large (max 12MB).")

        filename = f"{campaign.id}-instagram-browser-{uuid.uuid4().hex[:8]}.png"
        (_media_dir() / filename).write_bytes(raw)
        url_public = _public_url(f"social/{filename}")
        logger.info(
            "instagram_png_uploaded campaign_id=%s bytes=%s url=%s",
            campaign.id,
            len(raw),
            url_public,
        )
        return cls._persist_instagram_url(campaign, url_public)

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
        # Never replace a real uploaded WebM/MP4 with a static SVG.
        existing = (campaign.tiktok_video_url or "").strip()
        if existing and (".webm" in existing.lower() or ".mp4" in existing.lower()):
            return existing
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

    @classmethod
    def attach_site_promo_videos(cls, campaign: SocialCampaign, promo_ids: list[str]) -> list[str]:
        """
        Attach public site promo MP4s (landing page demos) as TikTok creatives.
        Buffer fetches them from FRONTEND_URL/videos/... — no re-upload needed.
        """
        from django.conf import settings

        allowed = {
            "logo": {"path": "/videos/logo.mp4", "title": "Your brand, ready to grow"},
            "landing-page": {
                "path": "/videos/landing-page.mp4",
                "title": "Landing page, assembled automatically",
            },
            "seo-settings": {
                "path": "/videos/seo-settings.mp4",
                "title": "Full SEO out of the box",
            },
        }
        ids = [str(x).strip() for x in (promo_ids or []) if str(x).strip()]
        if not ids:
            raise ValueError("Select at least one site promo video.")
        unknown = [x for x in ids if x not in allowed]
        if unknown:
            raise ValueError(f"Unknown promo video id(s): {', '.join(unknown)}")

        frontend = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
        if not frontend:
            raise ValueError("FRONTEND_URL is not configured — cannot attach site promo videos.")

        # Replace previous site-promo entries; keep AI/browser uploads.
        keep = [
            item
            for item in (campaign.tiktok_videos_json or [])
            if isinstance(item, dict) and item.get("provider") != "site_promo"
        ]
        attached: list[str] = []
        for pid in ids:
            meta = allowed[pid]
            url = f"{frontend}{meta['path']}"
            keep.append(
                {
                    "url": url,
                    "provider": "site_promo",
                    "promo_id": pid,
                    "title": meta["title"],
                    "variation": len(keep) + 1,
                    "credits_used": 0,
                }
            )
            attached.append(url)

        campaign.tiktok_videos_json = keep
        campaign.tiktok_video_url = attached[0]
        if campaign.media_type == "video" or not campaign.media_url:
            campaign.media_url = attached[0]
        campaign.save(update_fields=["tiktok_video_url", "tiktok_videos_json", "media_url", "updated_at"])
        cls.append_creative_log(
            campaign,
            f"Attached {len(attached)} site promo video(s) for TikTok: {', '.join(ids)}",
            level="success",
        )
        logger.info(
            "tiktok_site_promo_attached campaign_id=%s count=%s urls=%s",
            campaign.id,
            len(attached),
            attached,
        )
        return attached

    @staticmethod
    def save_tiktok_video(
        campaign: SocialCampaign,
        *,
        data_url: str,
        provider: str = "browser",
        use_for_instagram: bool = False,
    ) -> str:
        """Persist a browser-generated WebM/MP4 data URL for TikTok simulation/publish."""
        # Browsers often emit: data:video/webm;codecs=vp9,opus;base64,...
        # Parse by locating ;base64, so codec params (including commas) never break matching.
        raw_url = (data_url or "").strip()
        marker = ";base64,"
        idx = raw_url.find(marker)
        if not raw_url.startswith("data:") or idx < 0:
            preview = raw_url[:80].replace("\n", " ")
            raise ValueError(f"Invalid video data URL. Got prefix: {preview!r}")
        header = raw_url[5:idx]  # after "data:"
        b64 = raw_url[idx + len(marker) :]
        mime_base = header.split(";", 1)[0].strip().lower()
        if not mime_base.startswith("video/"):
            preview = raw_url[:80].replace("\n", " ")
            raise ValueError(f"Invalid video data URL (expected video/*). Got prefix: {preview!r}")
        ext = (
            "webm"
            if "webm" in mime_base
            else "mp4"
            if "mp4" in mime_base
            else "mov"
            if "quicktime" in mime_base or "mov" in mime_base
            else "bin"
        )
        if use_for_instagram and ext not in {"mp4", "mov"}:
            raise ValueError("Instagram video must be an MP4 or MOV file.")
        try:
            raw = base64.b64decode(b64, validate=False)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Invalid base64 video payload: {exc}") from exc
        if len(raw) < 64:
            raise ValueError("Video file is empty or too small.")
        if len(raw) > 25 * 1024 * 1024:
            raise ValueError("Video file is too large (max 25MB).")
        filename = f"{campaign.id}-tiktok-{uuid.uuid4().hex[:8]}.{ext}"
        path = _media_dir() / filename
        path.write_bytes(raw)
        url_public = _public_url(f"social/{filename}")
        campaign.tiktok_video_url = url_public
        videos = list(campaign.tiktok_videos_json or [])
        videos.append(
            {
                "url": url_public,
                "provider": provider,
                "variation": len(videos) + 1,
                "credits_used": 0,
            }
        )
        campaign.tiktok_videos_json = videos
        if use_for_instagram:
            campaign.instagram_media_type = "video"
            campaign.instagram_video_url = url_public
        if campaign.media_type == "video" or use_for_instagram:
            campaign.media_url = url_public
        campaign.save(
            update_fields=[
                "tiktok_video_url",
                "tiktok_videos_json",
                "instagram_media_type",
                "instagram_video_url",
                "media_url",
                "updated_at",
            ]
        )
        return url_public

    @classmethod
    def save_platform_media(
        cls,
        campaign: SocialCampaign,
        *,
        platform: str,
        kind: str,
        data_url: str,
    ) -> str:
        """Persist a per-platform image or video upload and invalidate simulation."""
        from social.domain.enums import CampaignStatus, SUPPORTED_PLATFORMS

        platform = (platform or "").strip().lower()
        kind = (kind or "").strip().lower()
        if platform not in SUPPORTED_PLATFORMS:
            raise ValueError(f"Unsupported platform: {platform}")
        if kind not in {"image", "video"}:
            raise ValueError("kind must be image or video")

        raw_url = (data_url or "").strip()
        marker = ";base64,"
        idx = raw_url.find(marker)
        if not raw_url.startswith("data:") or idx < 0:
            raise ValueError("Invalid media data URL.")
        header = raw_url[5:idx]
        b64 = raw_url[idx + len(marker) :]
        mime_base = header.split(";", 1)[0].strip().lower()

        try:
            raw = base64.b64decode(b64, validate=False)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Invalid base64 media payload: {exc}") from exc
        if len(raw) < 64:
            raise ValueError("Media file is empty or too small.")

        if kind == "image":
            if not mime_base.startswith("image/"):
                raise ValueError("Expected an image data URL.")
            if "png" in mime_base:
                ext = "png"
            elif "jpeg" in mime_base or "jpg" in mime_base:
                ext = "jpg"
            elif "webp" in mime_base:
                ext = "webp"
            else:
                raise ValueError("Image must be PNG, JPEG, or WebP.")
            if len(raw) > 12 * 1024 * 1024:
                raise ValueError("Image is too large (max 12MB).")
        else:
            if not mime_base.startswith("video/"):
                raise ValueError("Expected a video data URL.")
            if "mp4" in mime_base:
                ext = "mp4"
            elif "quicktime" in mime_base or "mov" in mime_base:
                ext = "mov"
            else:
                raise ValueError("Video must be MP4 or MOV.")
            if len(raw) > 25 * 1024 * 1024:
                raise ValueError("Video is too large (max 25MB).")

        filename = f"{campaign.id}-{platform}-{kind}-{uuid.uuid4().hex[:8]}.{ext}"
        (_media_dir() / filename).write_bytes(raw)
        url_public = _public_url(f"social/{filename}")

        update_fields = ["simulated_at", "updated_at"]
        campaign.simulated_at = None
        if campaign.status == CampaignStatus.SIMULATED:
            campaign.status = CampaignStatus.READY
            update_fields.append("status")

        if platform == "linkedin" and kind == "image":
            campaign.linkedin_image_url = url_public
            update_fields.append("linkedin_image_url")
            if not campaign.media_url:
                campaign.media_url = url_public
                update_fields.append("media_url")
        elif platform == "linkedin" and kind == "video":
            campaign.linkedin_video_url = url_public
            update_fields.append("linkedin_video_url")
        elif platform == "instagram" and kind == "image":
            campaign.instagram_image_url = url_public
            campaign.instagram_media_type = "image"
            campaign.media_url = url_public
            update_fields.extend(["instagram_image_url", "instagram_media_type", "media_url"])
        elif platform == "instagram" and kind == "video":
            campaign.instagram_video_url = url_public
            campaign.instagram_media_type = "video"
            update_fields.extend(["instagram_video_url", "instagram_media_type"])
        elif platform == "tiktok" and kind == "video":
            campaign.tiktok_video_url = url_public
            videos = list(campaign.tiktok_videos_json or [])
            videos.append(
                {
                    "url": url_public,
                    "provider": "manual",
                    "variation": len(videos) + 1,
                    "credits_used": 0,
                }
            )
            campaign.tiktok_videos_json = videos
            if campaign.media_type == "video":
                campaign.media_url = url_public
                update_fields.append("media_url")
            update_fields.extend(["tiktok_video_url", "tiktok_videos_json"])
        elif platform == "tiktok" and kind == "image":
            campaign.media_url = url_public
            update_fields.append("media_url")

        campaign.save(update_fields=list(dict.fromkeys(update_fields)))
        logger.info(
            "platform_media_saved campaign_id=%s platform=%s kind=%s url=%s",
            campaign.id,
            platform,
            kind,
            url_public[:180],
        )
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
                    metadata={
                        "campaign_id": str(campaign.id),
                        "tenant_id": str(campaign.tenant_id),
                        "variation": index + 1,
                    },
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
