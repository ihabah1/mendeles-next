from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from client_portal.application.portal_service import ClientPortalService
from core.exceptions.base import ForbiddenError
from rbac.application.permission_service import PermissionService


class ClientDashboardView(APIView):
    def get(self, request):
        tenant_id = request.user.default_tenant_id
        platform_wide = PermissionService.user_has_permission(
            request.user, "tenants.view", tenant_id
        )
        return Response(
            ClientPortalService.dashboard(
                tenant_id=tenant_id,
                user=request.user,
                platform_wide=platform_wide,
            )
        )


class ClientRequestsView(APIView):
    def get(self, request):
        tenant_id = request.user.default_tenant_id
        platform_wide = PermissionService.user_has_permission(
            request.user, "tenants.view", tenant_id
        )
        if not platform_wide and not PermissionService.user_has_permission(
            request.user, "requests.view", tenant_id
        ):
            raise ForbiddenError()
        return Response(
            {
                "results": ClientPortalService.list_requests(
                    tenant_id=tenant_id,
                    user=request.user,
                    platform_wide=platform_wide,
                )
            }
        )

    def post(self, request):
        tenant_id = request.user.default_tenant_id
        if not PermissionService.user_has_permission(
            request.user, "requests.create", tenant_id
        ):
            raise ForbiddenError()
        result = ClientPortalService.submit_request(
            tenant_id=tenant_id,
            user=request.user,
            product_type=request.data.get("product_type", ""),
            title=request.data.get("title", ""),
            brief=request.data.get("brief", ""),
            request=request,
        )
        return Response(result, status=status.HTTP_201_CREATED)
