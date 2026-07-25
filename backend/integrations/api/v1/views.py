from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.application.audit_service import AuditService
from core.exceptions.base import ForbiddenError
from core.permissions.base import HasPermission
from integrations.application.analytics_service import AnalyticsService
from integrations.application.google_config import frontend_oauth_return_url, setup_instructions
from integrations.application.google_oauth_service import GoogleOAuthError, GoogleOAuthService
from integrations.application.search_console_service import SearchConsoleService
from integrations.application.sync_service import IntegrationSyncService
from integrations.domain.enums import GoogleServiceType
from integrations.infrastructure.models import IntegrationSyncRecord


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


def _audit_google(request, *, action: str, service_type: str, metadata: dict | None = None, resource_id=None):
    """Audit helper — resource_id must be UUID or None (never service_type strings)."""
    AuditService.log(
        tenant_id=getattr(request.user, "default_tenant_id", None),
        user=request.user,
        action=action,
        resource_type="google_integration",
        resource_id=resource_id,
        metadata={"service_type": service_type, **(metadata or {})},
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
    )


class GoogleDashboardView(APIView):
    def get(self, request):
        _check(request, self, "integrations.view")
        return Response(IntegrationSyncService.dashboard(request.user.default_tenant_id))


class GoogleConnectView(APIView):
    def post(self, request):
        _check(request, self, "integrations.manage")
        service_type = request.data.get("service_type")
        if service_type not in {t.value for t in GoogleServiceType if t != GoogleServiceType.TRENDS}:
            return Response({"error": "Invalid service_type for OAuth connect"}, status=400)
        try:
            result = GoogleOAuthService.begin_connect(request.user.default_tenant_id, service_type)
        except GoogleOAuthError as exc:
            return Response(
                {
                    "error": str(exc),
                    "setup_required": exc.setup_required,
                    "setup_instructions": setup_instructions(),
                },
                status=503 if exc.setup_required else 400,
            )
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"error": f"Failed to start Google OAuth: {exc}"},
                status=500,
            )
        _audit_google(
            request,
            action="integrations.google.connect_started",
            service_type=service_type,
        )
        return Response(result)


@method_decorator(csrf_exempt, name="dispatch")
class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.query_params.get("state", "")
        code = request.query_params.get("code", "")
        error = request.query_params.get("error", "")
        return_url = frontend_oauth_return_url()
        if error:
            return HttpResponseRedirect(f"{return_url}?oauth_error={error}")
        if not state or not code:
            return HttpResponseRedirect(f"{return_url}?oauth_error=missing_code")
        try:
            conn = GoogleOAuthService.handle_callback(state=state, code=code)
            AuditService.log(
                tenant_id=conn.tenant_id,
                user=None,
                action="integrations.google.oauth_completed",
                resource_type="google_integration",
                resource_id=None,
                metadata={
                    "service_type": conn.service_type,
                    "email": conn.connected_account_email,
                },
            )
            return HttpResponseRedirect(f"{return_url}?oauth_success={conn.service_type}")
        except GoogleOAuthError as exc:
            return HttpResponseRedirect(f"{return_url}?oauth_error={exc}")


class GoogleDisconnectView(APIView):
    def post(self, request):
        _check(request, self, "integrations.manage")
        service_type = request.data.get("service_type")
        if service_type not in {t.value for t in GoogleServiceType}:
            return Response({"error": "Invalid service_type"}, status=400)
        GoogleOAuthService.disconnect(request.user.default_tenant_id, service_type)
        _audit_google(
            request,
            action="integrations.google.disconnected",
            service_type=service_type,
        )
        return Response({"ok": True})


class GooglePropertiesView(APIView):
    def get(self, request):
        _check(request, self, "integrations.view")
        service_type = request.query_params.get("service_type")
        tenant_id = request.user.default_tenant_id
        try:
            if service_type == GoogleServiceType.SEARCH_CONSOLE:
                props = SearchConsoleService.list_properties(tenant_id)
            elif service_type == GoogleServiceType.ANALYTICS:
                props = AnalyticsService.list_properties(tenant_id)
            else:
                return Response({"error": "Properties not available for this service"}, status=400)
        except GoogleOAuthError as exc:
            return Response({"error": str(exc), "properties": []}, status=400)
        return Response({"properties": props})


class GooglePropertySelectView(APIView):
    def post(self, request):
        _check(request, self, "integrations.manage")
        service_type = request.data.get("service_type")
        property_id = request.data.get("property_id", "")
        label = request.data.get("label", "")
        tenant_id = request.user.default_tenant_id
        try:
            if service_type == GoogleServiceType.SEARCH_CONSOLE:
                conn = SearchConsoleService.set_active_property(tenant_id, property_id)
            elif service_type == GoogleServiceType.ANALYTICS:
                conn = AnalyticsService.set_active_property(tenant_id, property_id, label=label)
            else:
                return Response({"error": "Invalid service_type"}, status=400)
        except GoogleOAuthError as exc:
            return Response({"error": str(exc)}, status=400)
        _audit_google(
            request,
            action="integrations.google.property_selected",
            service_type=service_type,
            metadata={"property_id": property_id},
        )
        return Response(GoogleOAuthService.serialize_connection(conn))


class GoogleSyncView(APIView):
    def post(self, request):
        _check(request, self, "integrations.manage")
        service_type = request.data.get("service_type")
        if service_type not in {t.value for t in GoogleServiceType}:
            return Response({"error": "Invalid service_type"}, status=400)
        config = {k: v for k, v in request.data.items() if k != "service_type"}
        try:
            job = IntegrationSyncService.enqueue_sync(
                request.user.default_tenant_id,
                request.user,
                service_type,
                config=config,
                request=request,
            )
        except GoogleOAuthError as exc:
            return Response({"error": str(exc)}, status=400)
        _audit_google(
            request,
            action="integrations.google.sync_queued",
            service_type=service_type,
            resource_id=job.id,
            metadata={"job_id": str(job.id)},
        )
        return Response({"job_id": str(job.id), "status": job.status})


class GoogleSyncHistoryView(APIView):
    def get(self, request):
        _check(request, self, "integrations.view")
        qs = IntegrationSyncRecord.objects.filter(
            tenant_id=request.user.default_tenant_id, deleted_at__isnull=True
        ).order_by("-retrieved_at")[:50]
        service_type = request.query_params.get("service_type")
        if service_type:
            qs = qs.filter(service_type=service_type)
        return Response(
            {
                "results": [
                    {
                        "id": str(r.id),
                        "service_type": r.service_type,
                        "source": r.source,
                        "language": r.language,
                        "country": r.country,
                        "retrieved_at": r.retrieved_at.isoformat(),
                        "sync_status": r.sync_status,
                        "last_sync_at": r.last_sync_at.isoformat() if r.last_sync_at else None,
                        "next_sync_at": r.next_sync_at.isoformat() if r.next_sync_at else None,
                        "error_message": r.error_message or None,
                        "processed_summary": _sync_summary(r),
                    }
                    for r in qs
                ]
            }
        )


def _sync_summary(record: IntegrationSyncRecord) -> dict:
    data = record.processed_data or {}
    if record.service_type == GoogleServiceType.SEARCH_CONSOLE:
        return data.get("summary", {})
    if record.service_type == GoogleServiceType.ANALYTICS:
        return data.get("metrics", {})
    if record.service_type == GoogleServiceType.TRENDS:
        return {
            "keywords": data.get("keywords", []),
            "trending_count": len(data.get("trending_searches", [])),
        }
    return {}
