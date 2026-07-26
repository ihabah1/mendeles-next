from __future__ import annotations

import logging
from datetime import timedelta, timezone as dt_timezone
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


def _failure_status_for(campaign: SocialCampaign) -> str:
    """Don't demote a previously released campaign to FAILED — CRON/republish rely on it."""
    if campaign.published_at or campaign.buffer_update_ids:
        return CampaignStatus.PUBLISHED
    if campaign.scheduled_at:
        return CampaignStatus.SCHEDULED
    return CampaignStatus.FAILED


class CampaignService:
    @staticmethod
    def serialize(campaign: SocialCampaign) -> dict[str, Any]:
        from social.application.campaign_report_service import campaign_tracking_code

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
            "linkedin_image_url": getattr(campaign, "linkedin_image_url", "") or "",
            "linkedin_video_url": getattr(campaign, "linkedin_video_url", "") or "",
            "instagram_image_url": campaign.instagram_image_url,
            "instagram_video_url": getattr(campaign, "instagram_video_url", "") or "",
            "instagram_media_type": campaign.instagram_media_type,
            "campaign_video_url": (
                getattr(campaign, "instagram_video_url", "") or campaign.tiktok_video_url or ""
            ),
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
            "tracking_code": campaign_tracking_code(campaign),
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
            "instagram_media_type": "instagram_media_type",
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
        if any(
            k in data
            for k in (
                "title",
                "captions",
                "hashtags",
                "cta",
                "media_prompt",
                "video_prompt",
                "media_url",
                "instagram_media_type",
                "platforms",
            )
        ):
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
            ensure_buffer_video_url,
            resolve_platform_image_url,
            resolve_platform_video_url,
            MISSING_PNG_MESSAGE,
        )

        log: list[dict[str, Any]] = []
        platforms = campaign.platforms or []

        def check(step: str, ok: bool, detail: str = ""):
            log.append({"step": step, "ok": ok, "detail": detail})
            return ok

        ok = True
        ok &= check("Campaign content", bool(campaign.title and campaign.captions_json), campaign.title or "missing title")

        buffer_video = ensure_buffer_video_url(campaign)
        instagram_uses_video = (
            "instagram" in platforms and campaign.instagram_media_type == "video"
        )
        linkedin_video = resolve_platform_video_url(campaign, "linkedin")
        linkedin_image = resolve_platform_image_url(campaign, "linkedin")
        needs_png = (
            ("linkedin" in platforms and not linkedin_video)
            or ("instagram" in platforms and not instagram_uses_video)
            or ("tiktok" in platforms and not buffer_video)
        )

        if needs_png:
            if "instagram" in platforms and not campaign.instagram_image_url and not linkedin_image:
                try:
                    MediaGenerationService.create_instagram_image(campaign)
                    campaign.refresh_from_db()
                except Exception as exc:
                    ok &= check("Instagram image", False, str(exc))

            png_url = (
                linkedin_image
                or resolve_platform_image_url(campaign, "instagram")
                or resolve_platform_image_url(campaign, "tiktok")
            )

            if not png_url and (campaign.instagram_image_url or "").lower().endswith(".svg"):
                try:
                    MediaGenerationService.create_instagram_image(campaign)
                    campaign.refresh_from_db()
                except Exception as exc:
                    ok &= check("Campaign PNG creative", False, str(exc))
                png_url = resolve_platform_image_url(campaign, "instagram") or resolve_platform_image_url(
                    campaign, "linkedin"
                )

            ok &= check(
                "Campaign PNG creative",
                bool(png_url),
                png_url or MISSING_PNG_MESSAGE,
            )

        if "instagram" in platforms:
            if instagram_uses_video:
                ig_video = resolve_platform_video_url(campaign, "instagram") or buffer_video
                ok &= check(
                    "Instagram video",
                    bool(ig_video),
                    ig_video or "Upload an MP4/MOV Instagram video before simulation.",
                )
            ok &= check(
                "Instagram caption",
                bool((campaign.captions_json or {}).get("instagram")),
                "caption ready" if (campaign.captions_json or {}).get("instagram") else "missing caption",
            )
            ok &= check("Website link on creative", bool(campaign.website_url), campaign.website_url or "missing URL")
        if "tiktok" in platforms:
            site_promos = [
                item
                for item in (campaign.tiktok_videos_json or [])
                if isinstance(item, dict) and item.get("provider") == "site_promo" and item.get("url")
            ]
            if site_promos:
                titles = ", ".join(
                    str(item.get("title") or item.get("promo_id") or "promo") for item in site_promos
                )
                ok &= check(
                    "TikTok site promo video",
                    True,
                    f"Using {len(site_promos)} site promo video(s): {titles}",
                )
            elif not campaign.tiktok_video_url:
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
            if linkedin_video:
                ok &= check("LinkedIn video", True, linkedin_video)
            elif linkedin_image or resolve_platform_image_url(campaign, "linkedin"):
                ok &= check(
                    "LinkedIn image",
                    True,
                    linkedin_image or resolve_platform_image_url(campaign, "linkedin"),
                )
            else:
                ok &= check("LinkedIn media", False, "Upload a LinkedIn image or video before simulation.")
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
        auto_release: bool = False,
        send_first_now: bool = False,
        interval_minutes: int = 0,
        repeat_count: int = 1,
    ) -> dict[str, Any]:
        try:
            if auto_release:
                # One-click path: bootstrap missing creatives → simulate → schedule/publish.
                CampaignService.bootstrap_creatives(campaign)
                campaign.refresh_from_db()
                CampaignService.run_simulation(campaign)
                campaign.refresh_from_db()
                if not campaign.simulated_at:
                    return CampaignService.serialize(campaign)
            return CampaignService._publish_inner(
                campaign,
                schedule=schedule,
                scheduled_at=scheduled_at,
                tz_name=tz_name,
                send_first_now=send_first_now,
                interval_minutes=interval_minutes,
                repeat_count=repeat_count,
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
                campaign.status = _failure_status_for(campaign)
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
        send_first_now: bool = False,
        interval_minutes: int = 0,
        repeat_count: int = 1,
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
            campaign.status = _failure_status_for(campaign)
            campaign.last_error = "Simulation required before releasing the campaign to the network."
            campaign.publish_log = [step("Gate", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)

        if not publisher.configured():
            campaign.status = _failure_status_for(campaign)
            campaign.last_error = "BUFFER_ACCESS_TOKEN is not configured on the server."
            campaign.publish_log = [step("Publishing to Buffer...", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)

        step("Simulation passed", campaign.simulated_at.isoformat())
        step("Preparing media...", "Using simulated creatives")

        from social.application.media_service import (
            MISSING_PNG_MESSAGE,
            UNREACHABLE_MEDIA_MESSAGE,
            ensure_reachable_buffer_image,
            ensure_reachable_buffer_video,
            media_url_is_reachable,
            public_media_url_for_buffer,
            resolve_platform_image_url,
        )

        if not campaign.media_url:
            campaign.media_url = (
                getattr(campaign, "linkedin_image_url", "")
                or campaign.instagram_image_url
                or getattr(campaign, "instagram_video_url", "")
                or campaign.tiktok_video_url
                or ""
            )
            if campaign.media_url:
                campaign.save(update_fields=["media_url", "updated_at"])

        # Prefer freshly reachable creatives — Railway /media is ephemeral across deploys.
        buffer_image = ensure_reachable_buffer_image(campaign, allow_regen=True)
        buffer_video = ensure_reachable_buffer_video(campaign, "tiktok")
        platforms = [p for p in (campaign.platforms or []) if p in SUPPORTED_PLATFORMS]
        instagram_uses_video = (
            "instagram" in platforms and campaign.instagram_media_type == "video"
        )
        linkedin_video = ensure_reachable_buffer_video(campaign, "linkedin")
        ig_video = (
            ensure_reachable_buffer_video(campaign, "instagram") if instagram_uses_video else ""
        )

        # Dead Instagram video → durable site promo, then image post (same idea as TikTok).
        if instagram_uses_video and not ig_video:
            try:
                from social.application.media_service import MediaGenerationService

                MediaGenerationService.attach_site_promo_videos(campaign, ["logo"])
                campaign.refresh_from_db()
                ig_video = ensure_reachable_buffer_video(campaign, "instagram")
                if not buffer_video:
                    buffer_video = ensure_reachable_buffer_video(campaign, "tiktok")
                if ig_video:
                    step(
                        "Instagram media fallback",
                        "Attached durable /videos/logo.mp4 promo",
                        True,
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "instagram_promo_fallback_failed campaign_id=%s: %s",
                    campaign.id,
                    exc,
                )
        if instagram_uses_video and not ig_video:
            if not buffer_image:
                buffer_image = ensure_reachable_buffer_image(campaign, allow_regen=True)
            if buffer_image:
                instagram_uses_video = False
                if campaign.instagram_media_type == "video":
                    campaign.instagram_media_type = "image"
                    campaign.save(update_fields=["instagram_media_type", "updated_at"])
                step(
                    "Instagram media fallback",
                    "Video URL unreachable — publishing as image post",
                    True,
                )
            else:
                campaign.status = _failure_status_for(campaign)
                campaign.last_error = (
                    "סרטון Instagram לא זמין ב־URL ציבורי ואין תמונת PNG חלופית. "
                    "צרפו סרטון promo מהאתר או לחצו Create Instagram image, ואז פרסמו שוב."
                )
                campaign.publish_log = log + [step("Uploading media...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)

        needs_image = (
            ("linkedin" in platforms and not linkedin_video)
            or ("instagram" in platforms and not instagram_uses_video)
            or ("tiktok" in platforms and not buffer_video)
        )
        if needs_image and not buffer_image and not resolve_platform_image_url(campaign, "linkedin"):
            campaign.status = _failure_status_for(campaign)
            campaign.last_error = MISSING_PNG_MESSAGE
            campaign.publish_log = log + [step("Uploading media...", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)
        if needs_image and buffer_image and not media_url_is_reachable(buffer_image):
            campaign.status = _failure_status_for(campaign)
            campaign.last_error = UNREACHABLE_MEDIA_MESSAGE
            campaign.publish_log = log + [step("Uploading media...", campaign.last_error, False)]
            campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
            return CampaignService.serialize(campaign)
        if "tiktok" in platforms and not buffer_video:
            try:
                from social.application.media_service import MediaGenerationService

                MediaGenerationService.attach_site_promo_videos(campaign, ["logo"])
                campaign.refresh_from_db()
                buffer_video = ensure_reachable_buffer_video(campaign, "tiktok")
                if buffer_video:
                    step("TikTok media fallback", "Attached durable /videos/logo.mp4 promo", True)
            except Exception as exc:  # noqa: BLE001
                logger.warning("tiktok_promo_fallback_failed campaign_id=%s: %s", campaign.id, exc)
        if "tiktok" in platforms and not buffer_video:
            # TikTok without reachable video: allow image-only only if we have a PNG.
            if not buffer_image:
                campaign.status = _failure_status_for(campaign)
                campaign.last_error = (
                    "סרטון TikTok לא זמין (קובץ /media נמחק אחרי deploy). "
                    "סמנו «Use site promo videos» או צרו מחדש, ואז פרסמו שוב."
                )
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
        interval_minutes = max(0, min(int(interval_minutes or 0), 60 * 24 * 30))
        repeat_count = max(1, min(int(repeat_count or 1), 48))
        needs_schedule_anchor = schedule and not (send_first_now and repeat_count == 1)
        if schedule:
            if needs_schedule_anchor and not scheduled_at:
                campaign.status = _failure_status_for(campaign)
                campaign.last_error = "scheduled_at is required when scheduling."
                campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)
            if scheduled_at:
                scheduled_dt = parse_datetime(scheduled_at)
                if scheduled_dt is None:
                    campaign.status = _failure_status_for(campaign)
                    campaign.last_error = "Invalid scheduled_at datetime."
                    campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                    campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                    return CampaignService.serialize(campaign)
                if timezone.is_naive(scheduled_dt):
                    scheduled_dt = timezone.make_aware(scheduled_dt, dt_timezone.utc)
                scheduled_iso = scheduled_dt.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            if tz_name:
                campaign.timezone = tz_name
            remaining_after_first = repeat_count - 1 if send_first_now else repeat_count
            if remaining_after_first > 1 and interval_minutes < 5:
                campaign.status = _failure_status_for(campaign)
                campaign.last_error = "interval_minutes must be at least 5 when repeat_count > 1."
                campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)
            if send_first_now and repeat_count > 1 and scheduled_dt is None:
                campaign.status = _failure_status_for(campaign)
                campaign.last_error = "scheduled_at is required for remaining sends after the first immediate send."
                campaign.publish_log = log + [step("Publishing to Buffer...", campaign.last_error, False)]
                campaign.save(update_fields=["status", "last_error", "publish_log", "updated_at"])
                return CampaignService.serialize(campaign)

        campaign.status = CampaignStatus.PUBLISHING
        campaign.scheduled_at = scheduled_dt if needs_schedule_anchor else None
        campaign.last_error = ""
        campaign.save(update_fields=["status", "scheduled_at", "timezone", "last_error", "updated_at"])

        buffer_ids: dict[str, str] = {}
        errors: list[str] = []
        platforms = [p for p in (campaign.platforms or []) if p in SUPPORTED_PLATFORMS]

        # Slots: optional immediate first send, then N scheduled sends from scheduled_at.
        if schedule and send_first_now:
            send_slots: list[tuple[str | None, bool]] = [(None, True)]
            if repeat_count > 1 and scheduled_dt is not None:
                for i in range(repeat_count - 1):
                    slot_iso = (
                        (scheduled_dt + timedelta(minutes=interval_minutes * i))
                        .astimezone(dt_timezone.utc)
                        .strftime("%Y-%m-%dT%H:%M:%S.000Z")
                    )
                    send_slots.append((slot_iso, False))
            step(
                "Send first now",
                (
                    f"1 immediate + {repeat_count - 1} scheduled every {interval_minutes} minutes"
                    if repeat_count > 1
                    else "1 immediate send"
                ),
                True,
            )
        elif schedule and scheduled_dt is not None and repeat_count > 1:
            send_slots = [
                (
                    (scheduled_dt + timedelta(minutes=interval_minutes * i))
                    .astimezone(dt_timezone.utc)
                    .strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    False,
                )
                for i in range(repeat_count)
            ]
            step(
                "Interval schedule",
                f"{repeat_count} sends every {interval_minutes} minutes starting {scheduled_iso}",
                True,
            )
        else:
            send_slots = [(scheduled_iso, not schedule)]

        rate_limited = False
        for slot_index, (slot_iso, send_now) in enumerate(send_slots):
            if rate_limited:
                break
            slot_label = f"#{slot_index + 1}/{len(send_slots)}"
            if len(send_slots) > 1:
                step(f"Queue slot {slot_label}", slot_iso or "now", True)
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
                # Always include tracked landing URL so GA4 can attribute post-publish visits.
                from social.application.campaign_report_service import tracked_website_url

                tracked = tracked_website_url(campaign, platform=platform)
                blob = "\n".join(text_parts)
                if tracked and tracked not in blob and campaign.website_url not in blob:
                    text_parts.append(tracked)
                elif campaign.website_url and campaign.website_url in blob and tracked not in blob:
                    text_parts = [part.replace(campaign.website_url, tracked) for part in text_parts]
                text = "\n\n".join(p for p in text_parts if p).strip()

                platform_video = ""
                if platform == "linkedin":
                    platform_video = linkedin_video
                elif platform == "instagram" and instagram_uses_video:
                    platform_video = ig_video or buffer_video
                elif platform == "tiktok":
                    platform_video = buffer_video
                platform_image = resolve_platform_image_url(campaign, platform) or buffer_image
                if platform_image and not media_url_is_reachable(platform_image):
                    platform_image = buffer_image if media_url_is_reachable(buffer_image) else ""
                media_for_platform = platform_image
                media_kind = "image"
                if platform == "tiktok" and platform_video:
                    media_for_platform = platform_video
                    media_kind = "video"
                elif platform == "tiktok":
                    media_for_platform = platform_image
                    media_kind = "image"
                elif platform == "instagram" and instagram_uses_video and platform_video:
                    media_for_platform = platform_video
                    media_kind = "video"
                elif platform == "linkedin" and platform_video:
                    media_for_platform = platform_video
                    media_kind = "video"
                elif platform in {"instagram", "linkedin"}:
                    media_for_platform = platform_image
                    media_kind = "image"

                media_for_platform = public_media_url_for_buffer(media_for_platform)
                if media_for_platform and not media_url_is_reachable(media_for_platform):
                    errors.append(
                        f"{platform}@{slot_label}: {UNREACHABLE_MEDIA_MESSAGE}"
                    )
                    step(
                        f"Publishing to Buffer... ({platform} {slot_label})",
                        UNREACHABLE_MEDIA_MESSAGE,
                        False,
                    )
                    continue

                logger.info(
                    "social_publish_platform campaign_id=%s platform=%s kind=%s media=%s text_len=%s slot=%s",
                    campaign.id,
                    platform,
                    media_kind,
                    (media_for_platform or "")[:180],
                    len(text),
                    slot_label,
                )

                result = publisher.publish(
                    PublishPayload(
                        text=text,
                        platform=platform,
                        media_url=media_for_platform,
                        media_kind=media_kind,
                        instagram_type="reel" if platform == "instagram" and media_kind == "video" else "post",
                        scheduled_at_iso=slot_iso,
                        now=send_now,
                    )
                )
                if result.ok:
                    # Keep the first successful Buffer id per platform for campaign metadata.
                    buffer_ids.setdefault(platform, result.external_id)
                    detail = result.channel_name or result.external_id or "queued"
                    step(f"Publishing to Buffer... ({platform} {slot_label})", detail, True)
                else:
                    errors.append(f"{platform}@{slot_label}: {result.error}")
                    step(f"Publishing to Buffer... ({platform} {slot_label})", result.error, False)
                    err_l = (result.error or "").lower()
                    if "rate_limit" in err_l or "rate-limited" in err_l or "חסם את ה-api" in (result.error or ""):
                        remaining = [p for p in platforms if p not in buffer_ids and p != platform]
                        for skipped in remaining:
                            skip_msg = result.error or "Buffer rate limited — skipped"
                            errors.append(f"{skipped}@{slot_label}: {skip_msg}")
                            step(f"Publishing to Buffer... ({skipped} {slot_label})", "Skipped (rate limit)", False)
                        rate_limited = True
                        break

        # Merge new Buffer ids; keep prior ids if this attempt added none (e.g. rate limit).
        prior_ids = dict(campaign.buffer_update_ids or {})
        campaign.buffer_update_ids = {**prior_ids, **buffer_ids}
        campaign.publish_log = log
        was_released = bool(campaign.published_at or prior_ids or campaign.scheduled_at)
        had_immediate_slot = any(send_now for _, send_now in send_slots)
        had_future_slot = any(not send_now for _, send_now in send_slots)

        if errors and not buffer_ids:
            # Total miss this attempt — keep prior release status so CRON can retry later.
            campaign.status = (
                CampaignStatus.PUBLISHED
                if (campaign.published_at or prior_ids)
                else (
                    CampaignStatus.SCHEDULED
                    if campaign.scheduled_at
                    else CampaignStatus.FAILED
                )
            )
            campaign.last_error = " | ".join(errors)
            step("Completed", campaign.last_error, False)
        elif errors:
            campaign.status = CampaignStatus.SCHEDULED if had_future_slot else CampaignStatus.PUBLISHED
            campaign.last_error = "Partial failure: " + " | ".join(errors)
            if had_immediate_slot:
                campaign.published_at = campaign.published_at or timezone.now()
            step("Completed", "Partial success", False)
        else:
            if had_future_slot:
                campaign.status = CampaignStatus.SCHEDULED
            else:
                campaign.status = CampaignStatus.PUBLISHED
            if had_immediate_slot or not had_future_slot:
                campaign.published_at = campaign.published_at or timezone.now()
            campaign.last_error = ""
            if send_first_now and had_future_slot:
                done_detail = (
                    f"Sent first now + queued {repeat_count - 1} more every {interval_minutes} minutes"
                )
            elif had_future_slot and repeat_count > 1:
                done_detail = f"Queued {repeat_count} sends every {interval_minutes} minutes"
            elif had_future_slot:
                done_detail = "All platforms queued"
            else:
                done_detail = "Published"
            if was_released and not had_future_slot:
                done_detail = "Republished"
            step("Completed", done_detail, True)

        campaign.publish_log = log
        campaign.save()
        return CampaignService.serialize(campaign)

    @staticmethod
    def batch_republish(
        tenant_id,
        campaign_ids: list,
        *,
        strategy: str = "random_one",
        schedule: bool = False,
        scheduled_at: str | None = None,
        interval_minutes: int = 60,
        tz_name: str | None = None,
    ) -> dict[str, Any]:
        """Republish previously published/scheduled campaigns.

        strategies:
          - random_one: shuffle pool, publish/schedule only the first
          - shuffle_all: shuffle pool, publish/schedule each (staggered when scheduling)
        """
        import random
        from datetime import timedelta

        ids = [str(cid) for cid in (campaign_ids or [])]
        if not ids:
            return {
                "strategy": strategy,
                "order": [],
                "results": [],
                "error": "Select at least one published campaign.",
            }

        qs = SocialCampaign.objects.filter(
            id__in=ids,
            tenant_id=tenant_id,
            deleted_at__isnull=True,
        )
        # Include previously released campaigns even if a later republish marked them failed.
        campaigns = [
            c
            for c in qs
            if c.status
            in {
                CampaignStatus.PUBLISHED,
                CampaignStatus.SCHEDULED,
                CampaignStatus.SIMULATED,
            }
            or c.published_at
            or bool(c.buffer_update_ids)
        ]
        if not campaigns:
            return {
                "strategy": strategy,
                "order": [],
                "results": [],
                "error": "No eligible published campaigns found for the selection.",
            }

        # Preserve only selected IDs that exist; shuffle for randomness.
        random.shuffle(campaigns)
        interval_minutes = max(5, min(int(interval_minutes or 60), 60 * 24 * 30))

        base_dt = None
        if schedule:
            if not scheduled_at:
                return {
                    "strategy": strategy,
                    "order": [],
                    "results": [],
                    "error": "scheduled_at is required when scheduling.",
                }
            base_dt = parse_datetime(scheduled_at)
            if base_dt is None:
                return {
                    "strategy": strategy,
                    "order": [],
                    "results": [],
                    "error": "Invalid scheduled_at datetime.",
                }
            if timezone.is_naive(base_dt):
                base_dt = timezone.make_aware(base_dt, dt_timezone.utc)

        selected: list[SocialCampaign]
        if strategy == "shuffle_all":
            selected = campaigns
        else:
            selected = campaigns[:1]

        results: list[dict[str, Any]] = []
        for index, campaign in enumerate(selected):
            if not campaign.simulated_at:
                CampaignService.run_simulation(campaign)
                campaign.refresh_from_db()
            if not campaign.simulated_at:
                failed = CampaignService.serialize(campaign)
                failed["batch_error"] = campaign.last_error or "Simulation failed before republish."
                results.append(failed)
                continue

            slot = None
            if schedule and base_dt is not None:
                slot_dt = base_dt + timedelta(minutes=interval_minutes * index)
                slot = slot_dt.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

            results.append(
                CampaignService.publish(
                    campaign,
                    schedule=schedule,
                    scheduled_at=slot,
                    tz_name=tz_name,
                )
            )

        return {
            "strategy": strategy,
            "order": [r.get("id") for r in results],
            "count": len(results),
            "results": results,
            "error": "",
        }
