from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardPagination
from core.permissions.base import HasPermission
from audit.infrastructure.models import AuditLog


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
