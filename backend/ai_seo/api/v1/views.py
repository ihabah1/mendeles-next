from rest_framework.response import Response
from rest_framework.views import APIView

from ai_seo.application.dashboard_service import AiSeoDashboardService
from audit.application.audit_service import AuditService
from core.exceptions.base import ForbiddenError
from core.permissions.base import HasPermission
from integrations.application.google_oauth_service import GoogleOAuthError
from integrations.application.sync_service import IntegrationSyncService
from integrations.domain.enums import GoogleServiceType


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


class AiSeoDashboardView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.build(tenant_id))


class AiSeoKeywordsStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.keywords_studio(tenant_id))


class AiSeoContentStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        services = AiSeoDashboardService.service_flags(tenant_id)
        ai = next((s for s in services if s["id"] == "ai_provider"), None)
        return Response(
            {
                "available": bool(ai and ai["connected"]),
                "services": services,
                "implemented_job_types": [],
                "message": (
                    "Content generation is not configured. Set GEMINI_API_KEY and connect integrations."
                    if not (ai and ai["connected"])
                    else "Content generation handlers are not implemented yet. Use Content to create pages manually."
                ),
            }
        )


class AiSeoReviewStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.content_review(tenant_id))


class AiSeoRefreshView(APIView):
    def post(self, request):
        _check(request, self, "ai_seo.manage")
        tenant_id = request.user.default_tenant_id
        section = request.data.get("section", "all")
        queued = []

        mapping = {
            "search_console": GoogleServiceType.SEARCH_CONSOLE,
            "analytics": GoogleServiceType.ANALYTICS,
            "trends": GoogleServiceType.TRENDS,
        }
        targets = list(mapping.keys()) if section == "all" else [section]

        for key in targets:
            service_type = mapping.get(key)
            if not service_type:
                continue
            try:
                job = IntegrationSyncService.enqueue_sync(
                    tenant_id,
                    request.user,
                    service_type,
                    config=request.data.get("config") or {},
                    request=request,
                )
                queued.append({"section": key, "job_id": str(job.id), "status": job.status})
            except (GoogleOAuthError, ValueError) as exc:
                queued.append({"section": key, "error": str(exc)})

        AuditService.log(
            tenant_id=tenant_id,
            user=request.user,
            action="ai_seo.refresh_requested",
            resource_type="ai_seo",
            metadata={"section": section, "queued": queued},
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response({"queued": queued, "dashboard": AiSeoDashboardService.build(tenant_id)})
