import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from identity.infrastructure.authentication import JWTAuthentication
from whatsapp.application.connection_service import ConnectionService
from whatsapp.application.legacy_twilio_agent import (
    generate_twilio_reply,
    twiml_response,
    whatsapp_agent_configured,
)

logger = logging.getLogger(__name__)


class WhatsAppStatusView(APIView):
    """Connection status — public summary or full dashboard payload."""

    permission_classes = [AllowAny]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        service = ConnectionService()
        user = getattr(request, "user", None)
        if user and user.is_authenticated and _has_integrations_view(request):
            return Response(service.get_status(public=False))
        return Response(service.get_status(public=True))


def _has_integrations_view(request) -> bool:
    tenant_id = getattr(request, "tenant_id", None) or getattr(request.user, "default_tenant_id", None)
    from rbac.application.permission_service import PermissionService

    return PermissionService.user_has_permission(request.user, "integrations.view", tenant_id)


class WhatsAppHealthView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "integrations.view"

    def get(self, request):
        service = ConnectionService()
        return Response(service.health_check())


class WhatsAppConnectView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "integrations.manage"

    def post(self, request):
        service = ConnectionService()
        return Response(service.connect())


class WhatsAppDisconnectView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "integrations.manage"

    def post(self, request):
        service = ConnectionService()
        return Response(service.disconnect())


class WhatsAppQrView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "integrations.view"

    def get(self, request):
        service = ConnectionService()
        return Response(service.get_qr())


class WhatsAppRefreshView(APIView):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "integrations.view"

    def post(self, request):
        service = ConnectionService()
        return Response(service.refresh())


@method_decorator(csrf_exempt, name="dispatch")
class WhatsAppWebhookView(APIView):
    """Legacy Twilio inbound webhook."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not whatsapp_agent_configured():
            return twiml_response("WhatsApp agent is not configured.")

        body = request.POST.get("Body", "")
        profile = request.POST.get("ProfileName", "")
        from_number = request.POST.get("From", "")
        logger.info("whatsapp_inbound", extra={"from": from_number, "body": body[:200]})
        reply = generate_twilio_reply(body, profile)
        return twiml_response(reply)

    def get(self, request):
        return Response({"message": "WhatsApp webhook ready"})


class WhatsAppSimulateView(APIView):
    """Legacy Twilio agent simulator for staff testing."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = (request.data.get("body") or request.data.get("message") or "").strip()
        if not body:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרש body", "details": {}}},
                status=400,
            )
        reply = generate_twilio_reply(body, request.user.first_name)
        return Response({"reply": reply})
