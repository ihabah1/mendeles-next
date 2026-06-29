from django.db import models
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from rbac.infrastructure.models import Permission, Role, RolePermission


class RoleListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "roles.view"

    def get(self, request):
        roles = Role.objects.filter(deleted_at__isnull=True).filter(
            models.Q(tenant_id=request.user.default_tenant_id) | models.Q(tenant__isnull=True)
        )
        data = []
        for role in roles:
            perms = list(
                RolePermission.objects.filter(role=role).values_list("permission__codename", flat=True)
            )
            data.append(
                {
                    "id": str(role.id),
                    "slug": role.slug,
                    "name": role.name,
                    "is_system": role.is_system,
                    "permissions": perms,
                }
            )
        return Response({"results": data})


class PermissionListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "roles.view"

    def get(self, request):
        perms = Permission.objects.all().order_by("module", "action")
        return Response(
            {
                "results": [
                    {
                        "id": str(p.id),
                        "codename": p.codename,
                        "module": p.module,
                        "action": p.action,
                        "description": p.description,
                    }
                    for p in perms
                ]
            }
        )
