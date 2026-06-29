from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions.base import ForbiddenError
from core.permissions.base import HasPermission
from identity.api.v1.serializers import InviteUserSerializer, UpdateUserSerializer
from identity.application.auth_service import AuthService
from identity.application.user_service import UserManagementService
from rbac.application.permission_service import PermissionService
from rbac.infrastructure.models import Role, UserRole


def _check_perm(request, codename: str) -> None:
    if not PermissionService.user_has_permission(request.user, codename, request.user.default_tenant_id):
        raise ForbiddenError()


class UserListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.view"

    def get(self, request):
        tenant_id = request.user.default_tenant_id
        users = UserManagementService.list_users(tenant_id)
        data = [
            {
                "id": str(u.id),
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "is_active": u.is_active,
                "roles": PermissionService.get_user_roles(u, tenant_id),
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ]
        return Response({"results": data})


class UserInviteView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.invite"

    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserManagementService.invite_user(
            tenant=request.user.default_tenant,
            invited_by=request.user,
            request=request,
            **serializer.validated_data,
        )
        return Response({"id": str(user.id), "email": user.email}, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.view"

    def get(self, request, user_id):
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        return Response(AuthService.serialize_user(user, request.user.default_tenant_id))

    def patch(self, request, user_id):
        _check_perm(request, "users.edit")
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        serializer = UpdateUserSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = UserManagementService.update_user(
            user, serializer.validated_data, request.user, request
        )
        return Response(AuthService.serialize_user(updated, request.user.default_tenant_id))

    def delete(self, request, user_id):
        _check_perm(request, "users.remove")
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        UserManagementService.soft_delete_user(user, request.user, request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRoleAssignView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.change_roles"

    def post(self, request, user_id):
        role_slug = request.data.get("role_slug")
        if not role_slug:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרש role_slug", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        role = Role.objects.filter(slug=role_slug, deleted_at__isnull=True).first()
        if not role:
            return Response(
                {"error": {"code": "not_found", "message": "תפקיד לא נמצא", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        UserRole.objects.get_or_create(
            user=user, role=role, tenant_id=request.user.default_tenant_id
        )
        return Response({"message": "התפקיד שויך בהצלחה"})

    def delete(self, request, user_id, role_id):
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        deleted, _ = UserRole.objects.filter(
            user=user, role_id=role_id, tenant_id=request.user.default_tenant_id
        ).delete()
        if not deleted:
            return Response(
                {"error": {"code": "not_found", "message": "שיוך תפקיד לא נמצא", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
