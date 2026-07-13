from __future__ import annotations

from datetime import timezone as dt_timezone
from typing import Any
from urllib.parse import quote

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from social.domain.enums import CampaignStatus, SUPPORTED_PLATFORMS
from social.infrastructure.models import SocialCampaign
from social.providers import get_default_publisher
from social.providers.base import PublishPayload


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
        campaign.media_url = campaign.media_url or _placeholder_media_url(
            campaign.media_prompt, campaign.media_type
        )
        campaign.save()
        return campaign

    @staticmethod
    def bootstrap_creatives(campaign: SocialCampaign, *, tiktok_count: int = 5) -> SocialCampaign:
        """Create Instagram + TikTok creatives immediately after text generation."""
        from social.application.media_service import MediaGenerationService

        platforms = campaign.platforms or []
        errors: list[str] = []

        # Always create an attractive campaign image on Generate.
        try:
            MediaGenerationService.create_instagram_image(campaign)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"image: {exc}")

        if "tiktok" in platforms:
            try:
                MediaGenerationService.generate_ai_tiktok_videos(
                    campaign,
                    count=max(1, min(int(tiktok_count or 5), 20)),
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"tiktok: {exc}")
                try:
                    MediaGenerationService.create_tiktok_creative(campaign)
                except Exception as fallback_exc:  # noqa: BLE001
                    errors.append(f"tiktok_fallback: {fallback_exc}")

        campaign.refresh_from_db()
        if campaign.instagram_image_url and (
            not campaign.media_url or "placehold.co" in (campaign.media_url or "")
        ):
            campaign.media_url = campaign.instagram_image_url
            campaign.save(update_fields=["media_url", "updated_at"])
        if errors and not (campaign.instagram_image_url or campaign.tiktok_video_url):
            campaign.last_error = "Creative bootstrap partial: " + " | ".join(errors)
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
        from social.application.media_service import MediaGenerationService

        log: list[dict[str, Any]] = []
        platforms = campaign.platforms or []

        def check(step: str, ok: bool, detail: str = ""):
            log.append({"step": step, "ok": ok, "detail": detail})
            return ok

        ok = True
        ok &= check("Campaign content", bool(campaign.title and campaign.captions_json), campaign.title or "missing title")
        if "instagram" in platforms:
            if not campaign.instagram_image_url:
                try:
                    MediaGenerationService.create_instagram_image(campaign)
                except Exception as exc:
                    ok &= check("Instagram image", False, str(exc))
                else:
                    ok &= check("Instagram image", True, campaign.instagram_image_url)
            else:
                ok &= check("Instagram image", True, campaign.instagram_image_url)
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
            campaign.last_error = "Simulation failed — fix the issues below before releasing."
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
        publisher = get_default_publisher()
        log: list[dict[str, Any]] = []

        def step(name: str, detail: str = "", ok: bool = True):
            entry = {"step": name, "detail": detail, "ok": ok, "at": timezone.now().isoformat()}
            log.append(entry)
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

        if not campaign.media_url:
            campaign.media_url = (
                campaign.instagram_image_url
                or campaign.tiktok_video_url
                or _placeholder_media_url(campaign.media_prompt, campaign.media_type)
            )
            campaign.save(update_fields=["media_url", "updated_at"])
        step("Uploading media...", campaign.media_url or "text-only")

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
            media_for_platform = ""
            if platform == "instagram":
                media_for_platform = campaign.instagram_image_url or campaign.media_url
            elif platform == "linkedin":
                media_for_platform = campaign.instagram_image_url or campaign.media_url
            elif platform == "tiktok":
                # Buffer GraphQL image asset; vertical video URL kept for simulation preview.
                media_for_platform = campaign.instagram_image_url or ""
            result = publisher.publish(
                PublishPayload(
                    text=text,
                    platform=platform,
                    media_url=media_for_platform,
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
