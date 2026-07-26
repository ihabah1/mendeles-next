from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import logging

from core.exceptions.base import ForbiddenError, NotFoundError, ValidationError
from core.permissions.base import HasPermission
from social.api.v1.serializers import (
    BatchRepublishSerializer,
    GenerateCampaignSerializer,
    PlatformMediaUploadSerializer,
    PublishCampaignSerializer,
    RandomRepublishCronSerializer,
    TikTokVideoUploadSerializer,
    UpdateCampaignSerializer,
)
from social.application.campaign_report_service import CampaignReportService
from social.application.campaign_service import CampaignService
from social.application.generation_service import CampaignGenerationService
from social.application.media_service import MediaGenerationService
from social.domain.enums import CampaignStatus
from social.infrastructure.models import SocialCampaign
from social.providers import get_default_publisher

logger = logging.getLogger(__name__)


def _tenant_id(request):
    tid = getattr(request.user, "default_tenant_id", None)
    if not tid:
        raise ValidationError("User has no tenant.")
    return tid


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


class SocialStatusView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request):
        _check(request, self, "automation.view")
        from ai_seo.application.gemini_service import GeminiService

        publisher = get_default_publisher()
        channels = []
        error = ""
        if publisher.configured():
            try:
                from social.providers.buffer import BufferPublisher

                if isinstance(publisher, BufferPublisher) and publisher.is_rate_limited():
                    error = BufferPublisher.rate_limit_message()
                    channels = [
                        {
                            "id": str(ch.get("id") or ""),
                            "service": ch.get("service") or "",
                            "name": ch.get("name") or "",
                            "display_name": ch.get("display_name") or "",
                            "label": ch.get("label") or "",
                            "type": ch.get("type") or "",
                            "is_disconnected": bool(ch.get("is_disconnected")),
                            "is_locked": bool(ch.get("is_locked")),
                            "formatted_username": ch.get("formatted_username") or ch.get("label") or "",
                        }
                        for ch in (BufferPublisher._channels_cache or [])
                    ]
                else:
                    channels = [
                        {
                            "id": str(ch.get("id") or ""),
                            "service": ch.get("service") or "",
                            "name": ch.get("name") or "",
                            "display_name": ch.get("display_name") or "",
                            "label": ch.get("label") or "",
                            "type": ch.get("type") or "",
                            "is_disconnected": bool(ch.get("is_disconnected")),
                            "is_locked": bool(ch.get("is_locked")),
                            "formatted_username": ch.get("formatted_username") or ch.get("label") or "",
                        }
                        for ch in publisher.list_channels()
                    ]
            except Exception as exc:
                error = str(exc)
        return Response(
            {
                "buffer_configured": publisher.configured(),
                "gemini_enabled": GeminiService.enabled(_tenant_id(request)),
                "channels": channels,
                # Back-compat for older UI
                "profiles": channels,
                "error": error,
            }
        )


class CampaignListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request):
        _check(request, self, "automation.view")
        return Response({"results": CampaignService.list_campaigns(_tenant_id(request))})

    def post(self, request):
        """Generate a new AI campaign."""
        _check(request, self, "automation.create")
        ser = GenerateCampaignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        tenant_id = _tenant_id(request)

        campaign = SocialCampaign.objects.create(
            tenant_id=tenant_id,
            created_by=request.user,
            goal=data["goal"],
            campaign_type=data["campaign_type"],
            tone=data["tone"],
            target_audience=data.get("target_audience") or "",
            website_url=data.get("website_url") or "",
            media_type=data.get("media_type") or "image",
            platforms=data["platforms"],
            status=CampaignStatus.GENERATING,
        )
        try:
            generated = CampaignGenerationService.generate(data, tenant_id=tenant_id)
            CampaignService.apply_generation(campaign, generated)
            CampaignService.bootstrap_creatives(
                campaign,
                tiktok_count=int(data.get("tiktok_video_count") or 5),
            )
        except Exception as exc:
            campaign.status = CampaignStatus.FAILED
            campaign.last_error = str(exc)
            campaign.save(update_fields=["status", "last_error", "updated_at"])
            raise ValidationError(str(exc)) from exc

        return Response(CampaignService.serialize(campaign), status=201)


class CampaignDetailView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request, campaign_id):
        _check(request, self, "automation.view")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        return Response(CampaignService.serialize(campaign))

    def patch(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        ser = UpdateCampaignSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        CampaignService.update_fields(campaign, ser.validated_data)
        return Response(CampaignService.serialize(campaign))

    def delete(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        CampaignService.soft_delete(campaign)
        return Response(status=204)


class SocialPublishView(APIView):
    """POST /api/v1/social/publish/ — publish or schedule via Buffer."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request):
        _check(request, self, "automation.manage")
        ser = PublishCampaignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        campaign = CampaignService.get_campaign(_tenant_id(request), data["campaign_id"])
        if not campaign:
            raise NotFoundError("Campaign not found.")
        logger.info(
            "social_publish_request campaign_id=%s mode=%s user_id=%s",
            campaign.id,
            data.get("mode"),
            getattr(request.user, "id", None),
        )
        result = CampaignService.publish(
            campaign,
            schedule=data["mode"] == "schedule",
            scheduled_at=data.get("scheduled_at") or None,
            tz_name=data.get("timezone") or None,
            auto_release=bool(data.get("auto_release")),
            send_first_now=bool(data.get("send_first_now")),
            interval_minutes=int(data.get("interval_minutes") or 0),
            repeat_count=int(data.get("repeat_count") or 1),
        )
        logger.info(
            "social_publish_response campaign_id=%s status=%s error=%s",
            campaign.id,
            result.get("status"),
            (result.get("last_error") or "")[:300],
        )
        return Response(result)


class CampaignRepublishView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        # Match batch republish: ensure simulation gate before Buffer send.
        if not campaign.simulated_at:
            CampaignService.run_simulation(campaign)
            campaign.refresh_from_db()
        result = CampaignService.publish(campaign, schedule=False)
        return Response(result)


class CampaignBatchRepublishView(APIView):
    """POST — republish selected published campaigns (random one or shuffled batch)."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request):
        _check(request, self, "automation.manage")
        ser = BatchRepublishSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        result = CampaignService.batch_republish(
            _tenant_id(request),
            data["campaign_ids"],
            strategy=data.get("strategy") or "random_one",
            schedule=data.get("mode") == "schedule",
            scheduled_at=data.get("scheduled_at") or None,
            interval_minutes=data.get("interval_minutes") or 60,
            tz_name=data.get("timezone") or None,
        )
        status_code = status.HTTP_400_BAD_REQUEST if result.get("error") else status.HTTP_200_OK
        return Response(result, status=status_code)


class RandomRepublishCronView(APIView):
    """GET status / POST enable|disable recurring random republish every X hours."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def get(self, request):
        _check(request, self, "automation.manage")
        from social.application.random_republish_cron_service import RandomRepublishCronService

        return Response(RandomRepublishCronService.status(_tenant_id(request)))

    def post(self, request):
        _check(request, self, "automation.manage")
        ser = RandomRepublishCronSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        from social.application.random_republish_cron_service import RandomRepublishCronService

        tenant_id = _tenant_id(request)
        if data.get("enabled"):
            result = RandomRepublishCronService.start(
                tenant_id,
                request.user,
                interval_hours=data.get("interval_hours") or 6,
                campaign_ids=[str(x) for x in (data.get("campaign_ids") or [])],
                last_order=[str(x) for x in (data.get("last_order") or [])],
                last_error=str(data.get("last_error") or ""),
            )
            code = status.HTTP_400_BAD_REQUEST if result.get("error") else status.HTTP_200_OK
            return Response(result, status=code)
        return Response(RandomRepublishCronService.stop(tenant_id, request.user))


class CampaignReportView(APIView):
    """GET — campaign performance report (name, datetime, visits from GA4 UTMs)."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request):
        _check(request, self, "automation.view")
        refresh = str(request.query_params.get("refresh") or "").lower() in {"1", "true", "yes"}
        return Response(CampaignReportService.build_report(_tenant_id(request), refresh_ga4=refresh))


class CampaignReportExportView(APIView):
    """GET — CSV export of campaign performance report."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request):
        from django.http import HttpResponse

        _check(request, self, "automation.view")
        csv_body = CampaignReportService.export_csv(_tenant_id(request))
        response = HttpResponse(csv_body, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="campaign-traffic-report.csv"'
        return response


class CampaignSimulateView(APIView):
    """POST — run dry-run checks; required before releasing to Buffer."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        return Response(CampaignService.run_simulation(campaign))


class CampaignInstagramImageView(APIView):
    """POST — generate square Instagram creative with website link on the image."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        try:
            data_url = str((request.data or {}).get("data_url") or "").strip()
            if data_url:
                MediaGenerationService.save_instagram_png(campaign, data_url=data_url)
            else:
                mode = str((request.data or {}).get("mode") or "").strip().lower()
                MediaGenerationService.create_instagram_image(campaign, require_ai=mode == "ai")
        except Exception as exc:
            raise ValidationError(str(exc)) from exc
        campaign.simulated_at = None
        if campaign.status == CampaignStatus.SIMULATED:
            campaign.status = CampaignStatus.READY
        campaign.save(update_fields=["simulated_at", "status", "updated_at"])
        return Response(CampaignService.serialize(campaign))


class CampaignPlatformMediaView(APIView):
    """POST — upload image or video for a specific platform (linkedin/instagram/tiktok)."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        ser = PlatformMediaUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            MediaGenerationService.save_platform_media(
                campaign,
                platform=ser.validated_data["platform"],
                kind=ser.validated_data["kind"],
                data_url=ser.validated_data["data_url"],
            )
        except Exception as exc:
            raise ValidationError(str(exc)) from exc
        campaign.refresh_from_db()
        return Response(CampaignService.serialize(campaign))


class CampaignTikTokVideoView(APIView):
    """POST — upload browser video, auto SVG creative, or AI multi-provider generation."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.manage"

    def post(self, request, campaign_id):
        _check(request, self, "automation.manage")
        campaign = CampaignService.get_campaign(_tenant_id(request), campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found.")
        ser = TikTokVideoUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data_url = (ser.validated_data.get("data_url") or "").strip()
        mode = ser.validated_data.get("mode") or "upload"
        use_for_instagram = bool(ser.validated_data.get("use_for_instagram"))
        count = ser.validated_data.get("count") or 1
        promo_ids = ser.validated_data.get("promo_ids") or []
        try:
            if mode == "promo":
                if not promo_ids:
                    raise ValidationError("Select at least one site promo video (promo_ids).")
                MediaGenerationService.attach_site_promo_videos(campaign, list(promo_ids))
                campaign.simulated_at = None
                if campaign.status == CampaignStatus.SIMULATED:
                    campaign.status = CampaignStatus.READY
                campaign.save(update_fields=["simulated_at", "status", "updated_at"])
                return Response(CampaignService.serialize(campaign))
            if mode == "ai" or (not data_url and request.data.get("count")):
                # Prefer sync — daemon async threads are unreliable on Gunicorn/Railway.
                async_mode = bool(request.data.get("async", False))
                if async_mode:
                    campaign.creative_log_json = []
                    campaign.creative_progress = 0
                    campaign.save(update_fields=["creative_log_json", "creative_progress", "updated_at"])
                    MediaGenerationService.start_ai_tiktok_async(campaign, count=count)
                    payload = CampaignService.serialize(campaign)
                    payload["ai_generation"] = {"async": True, "count": count}
                    return Response(payload, status=202)
                MediaGenerationService.append_creative_log(campaign, f"Starting sync AI generation ×{count}")
                batch = MediaGenerationService.generate_ai_tiktok_videos(campaign, count=count)
                payload = CampaignService.serialize(campaign)
                payload["ai_generation"] = batch
                return Response(payload)
            if data_url:
                MediaGenerationService.save_tiktok_video(
                    campaign,
                    data_url=data_url,
                    provider="manual" if mode == "manual" else "browser",
                    use_for_instagram=use_for_instagram,
                )
            else:
                MediaGenerationService.create_tiktok_creative(campaign)
        except Exception as exc:
            raise ValidationError(str(exc)) from exc
        campaign.simulated_at = None
        if campaign.status == CampaignStatus.SIMULATED:
            campaign.status = CampaignStatus.READY
        campaign.save(update_fields=["simulated_at", "status", "updated_at"])
        return Response(CampaignService.serialize(campaign))


class VideoProvidersStatusView(APIView):
    """GET — credit/status for Runway, Fal, Veo, LTX, Kling, local."""

    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "automation.view"

    def get(self, request):
        _check(request, self, "automation.view")
        from social.providers.video import get_video_orchestrator

        orch = get_video_orchestrator()
        return Response({"providers": orch.status(), "failover_order": [p.name for p in orch.providers]})
