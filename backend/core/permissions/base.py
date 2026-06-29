from rest_framework.permissions import BasePermission

from rbac.application.permission_service import PermissionService


class HasPermission(BasePermission):
    """DRF permission class — set `required_permission` on the view."""

    def has_permission(self, request, view):
        required = getattr(view, "required_permission", None)
        if not required:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        tenant_id = getattr(request, "tenant_id", None) or request.user.default_tenant_id
        return PermissionService.user_has_permission(request.user, required, tenant_id)
