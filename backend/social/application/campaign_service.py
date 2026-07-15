from __future__ import annotations

import logging
from datetime import timezone as dt_timezone
from typing import Any
from urllib.parse import quote

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from social.domain.enums import CampaignStatus, SUPPORTED_PLATFORMS
from social.infrastructure.models import SocialCampaign
from social.providers import get_default_publisher
from social.providers.base import PublishPayload

logger = logging.getLogger(__name__)


def _placeholder_media_url(prompt: str, media_type: str) -> str:
    """Deterministic placeholder visual until a real media pipeline is wired."""
    label = quote((prompt or "Mendeles campaign")[:80])
    bg = "6F42F5" if media_type == "image" else "111827"
    return f"https://placehold.co/1080x1080/{bg}/ffffff/png?text={label}"


class CampaignService:
    @staticmethod
    def serialize(campaign: SocialCampaign) -> dict[str, Any]:
        return {
            "id": str(campaign.id),
            "title": campaign.title,
            "goal": campaign.goal,
            "campaign_type": campaign.campaign_type,
            "tone": campaign.tone,
            "target_audience": campaign.target_audience,
            "website_url": campaign.website_url,
            "platforms": campaign.platforms or [],
            "captions": campaign.captions_json or {},
            "hashtags": campaign.hashtags_json or {},
            "cta": campaign.cta,
            "main_idea": campaign.main_idea,
            "media_type": campaign.media_type,
            "media_prompt": campaign.media_prompt,
            "video_prompt": campaign.video_prompt,
            "media_url": campaign.media_url,
            "instagram_image_url": campaign.instagram_image_url,
            "tiktok_video_url": campaign.tiktok_video_url,
            "tiktok_videos": campaign.tiktok_videos_json or [],
            "creative_log": campaign.creative_log_json or [],
            "creative_progress": int(campaign.creative_progress or 0),
            "tiktok_generating": bool(campaign.tiktok_generating),
            "simulated_at": campaign.simulated_at.isoformat() if campaign.simulated_at else None,
            "simulation_log": campaign.simulation_log or [],
            "status": campaign.status,
            "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
            "published_at": campaign.published_at.isoformat() if campaign.published_at else None,
            "timezone": campaign.timezone,
            "buffer_update_ids": campaign.buffer_update_ids or {},
            "last_error": campaign.last_error,
            "publish_log": campaign.publish_log or [],
            "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
        }

    @staticmethod
    def list_campaigns(tenant_id) -> list[dict[str, Any]]:
        qs = SocialCampaign.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("-created_at")[:100]
        return [CampaignService.serialize(c) for c in qs]

    @staticmethod
    def get_campaign(tenant_id, campaign_id) -> SocialCampaign | None:
        return SocialCampaign.objects.filter(
            id=campaign_id, tenant_id=tenant_id, deleted_at__isnull=True
        ).first()

    @staticmethod
    def apply_generation(campaign: SocialCampaign, generated: dict[str, Any]) -> SocialCampaign:
        campaign.title = generated.get("title") or campaign.title
        campaign.main_idea = generated.get("main_idea") or ""
        campaign.captions_json = generated.get("captions") or {}
        campaign.hashtags_json = generated.get("hashtags") or {}
        campaign.cta = generated.get("cta") or ""
        campaign.media_prompt = generated.get("media_prompt") or ""
        campaign.video_prompt = generated.get("video_prompt") or ""
        campaign.status = CampaignStatus.READY
        campaign.last_error = ""
        campaign.simulated_at = None
        campaign.simulation_log = []
        # Leave media empty — bootstrap_creatives creates the designed image next.
        campaign.media_url = ""
        campaign.save()
        return campaign

    @staticmethod
    def bootstrap_creatives(campaign: SocialCampaign, *, tiktok_count: int = 5) -> SocialCampaign:
        """Create campaign image + TikTok preview on Generate; AI video runs in background."""
        from social.application.media_service import MediaGenerationService

        platforms = campaign.platforms or []
        errors: list[str] = []

        try:
            MediaGenerationService.create_instagram_image(campaign)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"image: {exc}")

        if "tiktok" in platforms:
            try:
                # Instant preview; real playable video is created in the browser after Generate.
                MediaGenerationService.create_tiktok_creative(campaign)
                MediaGenerationService.append_creative_log(
                    campaign,
                    "TikTok static preview ready — browser will attach a playable WebM next",
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"tiktok: {exc}")

        campaign.refresh_from_db()
        if campaign.instagram_image_url:
            if campaign.media_type != "video" or not campaign.media_url or "placehold.co" in (campaign.media_url or ""):
                campaign.media_url = campaign.instagram_image_url
                campaign.save(update_fields=["media_url", "updated_at"])
        if errors and not campaign.instagram_image_url:
            campaign.last_error = "Creative bootstrap failed: " + " | ".join(errors)
            campaign.save(update_fields=["last_error", "updated_at"])
        return campaign

    @staticmethod
    def update_fields(campaign: SocialCampaign, data: dict[str, Any]) -> SocialCampaign:
        mapping = {
            "title": "title",
            "cta": "cta",
            "media_prompt": "media_prompt",
            "video_prompt": "video_prompt",
            "media_url": "media_url",
            "timezone": "timezone",
        }
        for src, dest in mapping.items():
            if src in data and data[src] is not None:
                setattr(campaign, dest, data[src])
        if "captions" in data and isinstance(data["captions"], dict):
            campaign.captions_json = data["captions"]
        if "hashtags" in data and isinstance(data["hashtags"], dict):
            campaign.hashtags_json = data["hashtags"]
        if "platforms" in data and isinstance(data["platforms"], list):
            campaign.platforms = [p for p in data["platforms"] if p in SUPPORTED_PLATFORMS]
        # Edits invalidate prior simulation.
        if any(k in data for k in ("title", "captions", "hashtags", "cta", "media_prompt", "video_prompt", "media_url", "platforms")):
            campaign.simulated_at = None
            if campaign.status == CampaignStatus.SIMULATED:
                campaign.status = CampaignStatus.READY
        campaign.save()
        return campaign

    @staticmethod
    def soft_delete(campaign: SocialCampaign) -> None:
        campaign.soft_delete()

    @staticmethod
    def run_simulation(campaign: SocialCampaign) -> dict[str, Any]:
        """Validate creatives + captions before allowing real Buffer publish."""
        from social.application.media_service import (
            MediaGenerationService,
            is_real_raster_image_url,
            public_media_url_for_buffer,
            MISSING_PNG_MESSAGE,
        )

        log: list[dict[str, Any]] = []
        platforms = campaign.platforms or []

        def check(step: str, ok: bool, detail: str = ""):
            log.append({"step": step, "ok": ok, "detail": detail})
            return ok

        ok = True
        ok &= check("Campaign content", bool(campaign.title and campaign.captions_json), campaign.title or "missing title")

        needs_png = any(p in platforms for p in ("instagram", "linkedin"))
        if "tiktok" in platforms:
            # Photo fallback for TikTok when no MP4 — still needs a real PNG.
            from social.application.media_service import ensure_buffer_video_url

            has_mp4 = bool(ensure_buffer_video_url(campaign))
            if not has_mp4:
                needs_png = True

        if needs_png:
            if "instagram" in platforms and not campaign.instagram_image_url:
                try:
                    MediaGenerationService.create_instagram_image(campaign)
                    campaign.refresh_from_db()
                except Exception as exc:
                    ok &= check("Instagram image", False, str(exc))

            png_url = ""
            for candidate in (campaign.instagram_image_url, campaign.media_url):
                public = public_media_url_for_buffer(candidate or "")
                if is_real_raster_image_url(public):
                    png_url = public
                    break

            if not png_url and (campaign.instagram_image_url or "").lower().endswith(".svg"):
                # One regen attempt during simulation (may still yield SVG without Gemini).
                try:
                    MediaGenerationService.create_instagram_image(campaign)
                    campaign.refresh_from_db()
                except Exception as exc:
                    ok &= check("Campaign PNG creative", False, str(exc))
                for candidate in (campaign.instagram_image_url, campaign.media_url):
                    public = public_media_url_for_buffer(candidate or "")
                    if is_real_raster_image_url(public):
                        png_url = public
                        break

            ok &= check(
                "Campaign PNG creative",
                bool(png_url),
                png_url or MISSING_PNG_MESSAGE,
            )

        if "instagram" in platforms:
            ok &= check(
                "Instagram caption",
                bool((campaign.captions_json or {}).get("instagram")),
                "caption ready" if (campaign.captions_json or {}).get("instagram") else "missing caption",
            )
            ok &= check("Website link on creative", bool(campaign.website_url), campaign.website_url or "missing URL")
        if "tiktok" in platforms:
            if not campaign.tiktok_video_url:
                try:
                    MediaGenerationService.create_tiktok_creative(campaign)
                except Exception as exc:
                    ok &= check("TikTok video", False, str(exc))
                else:
                    ok &= check("TikTok video", True, campaign.tiktok_video_url)
            else:
                ok &= check("TikTok video", True, campaign.tiktok_video_url)
            ok &= check(
                "TikTok caption",
                bool((campaign.captions_json or {}).get("tiktok")),
                "caption ready" if (campaign.captions_json or {}).get("tiktok") else "missing caption",
            )
        if "linkedin" in platforms:
            ok &= check(
                "LinkedIn caption",
                bool((campaign.captions_json or {}).get("linkedin")),
                "caption ready" if (campaign.captions_json or {}).get("linkedin") else "missing caption",
            )

        campaign.simulation_log = log
        if ok:
            campaign.simulated_at = timezone.now()
            campaign.status = CampaignStatus.SIMULATED
            campaign.last_error = ""
        else:
            campaign.simulated_at = None
            campaign.status = CampaignStatus.READY
            failed = [e for e in log if not e.get("ok")]
            detail = (failed[0].get("detail") if failed else "") or "Simulation failed — fix the issues below before releasing."
            campaign.last_error = str(detail)[:2000]
        campaign.save()
        return CampaignService.serialize(campaign)

    @staticmethod
    def publish(
        campaign: SocialCampaign,
        *,
        schedule: bool = False,
        scheduled_at: str | None = None,
        tz_name: str | None = None,
    ) -> dict[str, Any]:
        try:
            return CampaignService._publish_inner(
                campaign,
                schedule=schedule,
                scheduled_at=scheduled_at,
                tz_name=tz_name,
            )
        except Exception as exc:  # noqa: BLE001 — never return HTML 500 for publish
            logger.exception(
                "social_publish_crash campaign_id=%s schedule=%s platforms=%s",
                getattr(campaign, "id", None),
                schedule,
                getattr(campaign, "platforms", None),
            )
            msg = f"Publish crashed: {type(exc).__name__}: {exc}"
            try:
                campaign.status = CampaignStatus.FAILED
                campaign.last_error = msg[:2000]
                campaign.publish_log = list(campaign.publish_log or []) + [
                    {
                        "step": "Publishing to Buffer...",
                        "detail": msg[:500],
                        "ok": False,
                        "at": timezone.now().isoformat(),
                    }
                ]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            except Exception:  # noqa: BLE001
                logger.exception("social_publish_crash_persist_failed campaign_id=%s", getattr(campaign, "id", None))
            return CampaignService.serialize(campaign)

    @staticmethod
    def _publish_inner(
        campaign: SocialCampaign,
        *,
        schedule: bool = False,
        scheduled_at: str | None = None,
        tz_name: str | None = None,
    ) -> dict[str, Any]:
        publisher = get_default_publisher()
        log: list[dict[str, Any]] = []

        def step(name: str, detail: str = "", ok: bool = True):
            entry = {"step": name, "detail": detail, "ok": ok, "at": timezone.now().isoformat()}
            log.append(entry)
            logger.info(
                "social_publish_step campaign_id=%s ok=%s step=%s detail=%s",
                campaign.id,
                ok,
                name,
                (detail or "")[:300],
            )
            return entry

        if not campaign.simulated_at:
            campaign.status = CampaignStatus.FAILED
            campaign.last_error = "Simulation required before releasing the campaign to the network."
            campaign.publish_log = [step("Gate", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)

        if not publisher.configured():
            campaign.status = CampaignStatus.FAILED
            campaign.last_error = "BUFFER_ACCESS_TOKEN is not configured on the server."
            campaign.publish_log = [step("Publishing to Buffer...", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)

        step("Simulation passed", campaign.simulated_at.isoformat())
        step("Preparing media...", "Using simulated creatives")

        from social.application.media_service import (
            MISSING_PNG_MESSAGE,
            ensure_buffer_image_url,
            ensure_buffer_video_url,
            public_media_url_for_buffer,
        )

        if not campaign.media_url:
            campaign.media_url = campaign.instagram_image_url or campaign.tiktok_video_url or ""
            if campaign.media_url:
                campaign.save(update_fields=["media_url", "updated_at"])

        # Never run Gemini during Buffer publish — real PNG only (no placehold fallback).
        buffer_image = ensure_buffer_image_url(campaign, allow_ai_regen=False)
        buffer_video = ensure_buffer_video_url(campaign)
        platforms = [p for p in (campaign.platforms or []) if p in SUPPORTED_PLATFORMS]
        needs_image = any(p in platforms for p in ("linkedin", "instagram")) or (
            "tiktok" in platforms and not buffer_video
        )
        if needs_image and not buffer_image:
            campaign.status = CampaignStatus.FAILED
            campaign.last_error = MISSING_PNG_MESSAGE
            campaign.publish_log = log + [step("Uploading media...", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)

        logger.info(
            "social_publish_media campaign_id=%s image=%s video=%s ig=%s media=%s",
            campaign.id,
            (buffer_image or "")[:180],
            (buffer_video or "")[:180],
            (campaign.instagram_image_url or "")[:120],
            (campaign.media_url or "")[:120],
        )
        if buffer_image and (
            not campaign.media_url
            or str(campaign.media_url).lower().endswith(".svg")
            or not str(campaign.media_url).startswith("http")
        ):
            campaign.media_url = buffer_image[:1000]
            campaign.save(update_fields=["media_url", "updated_at"])
        step("Uploading media...", buffer_image or buffer_video or campaign.media_url or "text-only")

        scheduled_dt = None
        scheduled_iso = None
        if schedule:
            if not scheduled_at:
                campaign.status = CampaignStatus.FAILED
                campaign.last_error = "scheduled_at is required when scheduling."
                campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)
            scheduled_dt = parse_datetime(scheduled_at)
            if scheduled_dt is None:
                campaign.status = CampaignStatus.FAILED
                campaign.last_error = "Invalid scheduled_at datetime."
                campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)
            if timezone.is_naive(scheduled_dt):
                scheduled_dt = timezone.make_aware(scheduled_dt, dt_timezone.utc)
            scheduled_iso = scheduled_dt.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            if tz_name:
                campaign.timezone = tz_name

        campaign.status = CampaignStatus.PUBLISHING
        campaign.scheduled_at = scheduled_dt if schedule else None
        campaign.last_error = ""
        campaign.save(update_fields=["status", "scheduled_at", "timezone", "last_error", "updated_at"])

        buffer_ids: dict[str, str] = {}
        errors: list[str] = []
        platforms = [p for p in (campaign.platforms or []) if p in SUPPORTED_PLATFORMS]

        for platform in platforms:
            caption = (campaign.captions_json or {}).get(platform) or ""
            tags = (campaign.hashtags_json or {}).get(platform) or []
            tag_line = " ".join(tags) if tags else ""
            cta = campaign.cta or ""
            text_parts = [caption]
            if tag_line and tag_line not in caption:
                text_parts.append(tag_line)
            if cta and cta not in caption:
                text_parts.append(cta)
            text = "\n\n".join(p for p in text_parts if p).strip()

            media_for_platform = buffer_image
            media_kind = "image"
            if platform == "tiktok" and buffer_video:
                media_for_platform = buffer_video
                media_kind = "video"
            elif platform == "tiktok":
                media_for_platform = buffer_image
                media_kind = "image"
            elif platform in {"instagram", "linkedin"}:
                media_for_platform = buffer_image
                media_kind = "image"

            media_for_platform = public_media_url_for_buffer(media_for_platform)
            logger.info(
                "social_publish_platform campaign_id=%s platform=%s kind=%s media=%s text_len=%s",
                campaign.id,
                platform,
                media_kind,
                (media_for_platform or "")[:180],
                len(text),
            )

            result = publisher.publish(
                PublishPayload(
                    text=text,
                    platform=platform,
                    media_url=media_for_platform,
                    media_kind=media_kind,
                    instagram_type="post",
                    scheduled_at_iso=scheduled_iso,
                    now=not schedule,
                )
            )
            if result.ok:
                buffer_ids[platform] = result.external_id
                detail = result.channel_name or result.external_id or "queued"
                step(f"Publishing to Buffer... ({platform})", detail, True)
            else:
                errors.append(f"{platform}: {result.error}")
                step(f"Publishing to Buffer... ({platform})", result.error, False)
                err_l = (result.error or "").lower()
                if "rate_limit" in err_l or "rate-limited" in err_l or "חסם את ה-api" in (result.error or ""):
                    remaining = [p for p in platforms if p not in buffer_ids and p != platform]
                    for skipped in remaining:
                        skip_msg = result.error or "Buffer rate limited — skipped"
                        errors.append(f"{skipped}: {skip_msg}")
                        step(f"Publishing to Buffer... ({skipped})", "Skipped (rate limit)", False)
                    break

        campaign.buffer_update_ids = {**(campaign.buffer_update_ids or {}), **buffer_ids}
        campaign.publish_log = log

        if errors and not buffer_ids:
            campaign.status = CampaignStatus.FAILED
            campaign.last_error = " | ".join(errors)
            step("Completed", campaign.last_error, False)
        elif errors:
            campaign.status = CampaignStatus.SCHEDULED if schedule else CampaignStatus.PUBLISHED
            campaign.last_error = "Partial failure: " + " | ".join(errors)
            if schedule:
                pass
            else:
                campaign.published_at = timezone.now()
            step("Completed", "Partial success", False)
        else:
            if schedule:
                campaign.status = CampaignStatus.SCHEDULED
            else:
                campaign.status = CampaignStatus.PUBLISHED
                campaign.published_at = timezone.now()
            step("Completed", "All platforms queued" if schedule else "Published", True)

        campaign.publish_log = log
        campaign.save()
        return CampaignService.serialize(campaign)
