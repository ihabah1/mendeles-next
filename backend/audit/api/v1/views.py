from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination
from core.permissions.base import HasPermission
from audit.infrastructure.models import AuditLog, SiteErrorLog
from rbac.application.permission_service import PermissionService
from tenancy.application.public_tenant import resolve_public_tenant_id


class AuditLogListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "audit.view"

    def get(self, request):
        qs = AuditLog.objects.filter(tenant_id=request.user.default_tenant_id)
        action = request.query_params.get("action")
        user_id = request.query_params.get("user_id")
        if action:
            qs = qs.filter(action=action)
        if user_id:
            qs = qs.filter(user_id=user_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                "id": str(log.id),
                "action": log.action,
                "user_id": str(log.user_id) if log.user_id else None,
                "resource_type": log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "metadata": log.metadata,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in page
        ]
        return paginator.get_paginated_response(data)


class SiteErrorLogListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "audit.view"

    def get(self, request):
        qs = SiteErrorLog.objects.order_by("-created_at")
        if not PermissionService.user_has_permission(request.user, "tenants.view", request.user.default_tenant_id):
            qs = qs.filter(tenant_id=request.user.default_tenant_id)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                "id": str(log.id),
                "level": log.level,
                "source": log.source,
                "message": log.message,
                "url": log.url,
                "user_email": log.user_email,
                "created_at": log.created_at.isoformat(),
            }
            for log in page
        ]
        return paginator.get_paginated_response(data)


class SiteErrorReportView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "message required"}, status=400)
        if len(message) > 4000:
            message = message[:4000]

        tenant_id = resolve_public_tenant_id()
        SiteErrorLog.objects.create(
            tenant_id=tenant_id,
            level=request.data.get("level", SiteErrorLog.Level.ERROR),
            source=request.data.get("source", SiteErrorLog.Source.FRONTEND),
            message=message,
            stack_trace=(request.data.get("stack_trace") or "")[:8000],
            url=(request.data.get("url") or "")[:500],
            user_email=(request.data.get("user_email") or "")[:255],
            metadata=request.data.get("metadata") if isinstance(request.data.get("metadata"), dict) else {},
        )
        return Response({"ok": True}, status=201)
