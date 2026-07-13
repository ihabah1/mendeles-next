from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions.base import ForbiddenError, NotFoundError, ValidationError
from core.permissions.base import HasPermission
from social.api.v1.serializers import (
    GenerateCampaignSerializer,
    PublishCampaignSerializer,
    TikTokVideoUploadSerializer,
    UpdateCampaignSerializer,
)
from social.application.campaign_service import CampaignService
from social.application.generation_service import CampaignGenerationService
from social.application.media_service import MediaGenerationService
from social.domain.enums import CampaignStatus
from social.infrastructure.models import SocialCampaign
from social.providers import get_default_publisher


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
        publisher = get_default_publisher()
        channels = []
        error = ""
        if publisher.configured():
            try:
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
            generated = CampaignGenerationService.generate(data)
            CampaignService.apply_generation(campaign, generated)
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
        result = CampaignService.publish(
            campaign,
            schedule=data["mode"] == "schedule",
            scheduled_at=data.get("scheduled_at") or None,
            tz_name=data.get("timezone") or None,
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
        result = CampaignService.publish(campaign, schedule=False)
        return Response(result)


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
            MediaGenerationService.create_instagram_image(campaign)
        except Exception as exc:
            raise ValidationError(str(exc)) from exc
        campaign.simulated_at = None
        if campaign.status == CampaignStatus.SIMULATED:
            campaign.status = CampaignStatus.READY
        campaign.save(update_fields=["simulated_at", "status", "updated_at"])
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
        count = ser.validated_data.get("count") or 1
        try:
            if mode == "ai" or (not data_url and request.data.get("count")):
                batch = MediaGenerationService.generate_ai_tiktok_videos(campaign, count=count)
                payload = CampaignService.serialize(campaign)
                payload["ai_generation"] = batch
                return Response(payload)
            if data_url:
                MediaGenerationService.save_tiktok_video(campaign, data_url=data_url)
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
