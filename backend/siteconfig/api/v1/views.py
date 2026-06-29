from django.conf import settings
from django.db import connection
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from siteconfig.application.settings_service import SettingsService


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False
        status_code = 200 if db_ok else 503
        return Response(
            {
                "status": "healthy" if db_ok else "unhealthy",
                "version": settings.APP_VERSION,
                "database": "connected" if db_ok else "disconnected",
                "timestamp": timezone.now().isoformat(),
            },
            status=status_code,
        )


class SettingsView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [HasPermission()]
        if self.request.method == "PATCH":
            return [HasPermission()]
        return super().get_permissions()

    def get(self, request):
        self.required_permission = "settings.view"
        if not HasPermission().has_permission(request, self):
            from core.exceptions.base import ForbiddenError

            raise ForbiddenError()
        return Response(SettingsService.get_tenant_settings(request.user.default_tenant_id))

    def patch(self, request):
        self.required_permission = "settings.manage"
        if not HasPermission().has_permission(request, self):
            from core.exceptions.base import ForbiddenError

            raise ForbiddenError()
        data = SettingsService.update_tenant_settings(
            request.user.default_tenant_id, request.data, request.user
        )
        return Response(data)
