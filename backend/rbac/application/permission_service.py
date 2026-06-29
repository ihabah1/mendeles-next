from django.contrib.auth import get_user_model

from rbac.infrastructure.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


class PermissionService:
    @staticmethod
    def user_has_permission(user: User, codename: str, tenant_id=None) -> bool:
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        permissions = PermissionService.get_user_permissions(user, tenant_id)
        return codename in permissions

    @staticmethod
    def get_user_permissions(user: User, tenant_id=None) -> set[str]:
        if user.is_superuser:
            return {p.codename for p in Permission.objects.all()}
        tid = tenant_id or (str(user.default_tenant_id) if user.default_tenant_id else None)
        if not tid:
            return set()
        role_ids = UserRole.objects.filter(user=user, tenant_id=tid).values_list("role_id", flat=True)
        return set(
            RolePermission.objects.filter(role_id__in=role_ids).values_list(
                "permission__codename", flat=True
            )
        )

    @staticmethod
    def get_user_roles(user: User, tenant_id=None) -> list[str]:
        if user.is_superuser:
            return ["super_admin"]
        tid = tenant_id or (str(user.default_tenant_id) if user.default_tenant_id else None)
        if not tid:
            return []
        return list(
            UserRole.objects.filter(user=user, tenant_id=tid).values_list("role__slug", flat=True)
        )
