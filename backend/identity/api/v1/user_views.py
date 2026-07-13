from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions.base import ForbiddenError
from core.permissions.base import HasPermission
from identity.api.v1.serializers import InviteUserSerializer, UpdateUserSerializer
from identity.application.auth_service import AuthService
from identity.application.purge_service import UserPurgeService
from identity.application.user_hub_service import UserHubService
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
        platform_wide = PermissionService.user_has_permission(
            request.user, "tenants.view", tenant_id
        )
        users = UserManagementService.list_users(tenant_id, platform_wide=platform_wide)
        data = []
        for u in users:
            role_tenant_id = u.default_tenant_id if platform_wide else tenant_id
            role_rows = UserRole.objects.filter(user=u, tenant_id=role_tenant_id).select_related("role")
            data.append(
                {
                    "id": str(u.id),
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "is_active": u.is_active,
                    "email_verified": u.is_email_verified,
                    "phone": u.phone or "",
                    "preferred_locale": u.preferred_locale or "he",
                    "tenant_name": u.default_tenant.name if u.default_tenant else None,
                    "roles": PermissionService.get_user_roles(u, role_tenant_id),
                    "role_assignments": [
                        {"id": str(ur.role_id), "slug": ur.role.slug, "name": ur.role.name}
                        for ur in role_rows
                    ],
                    "created_at": u.created_at.isoformat(),
                }
            )
        return Response({"results": data, "scope": "platform" if platform_wide else "tenant"})


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


class UserResetPasswordView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.edit"

    def post(self, request, user_id):
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        UserManagementService.admin_reset_password(
            user=user, requested_by=request.user, request=request
        )
        return Response({"message": "נשלח קישור לאיפוס סיסמה"})


class UserResendVerificationView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.edit"

    def post(self, request, user_id):
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        sent = UserManagementService.admin_resend_verification(
            user=user, requested_by=request.user, request=request
        )
        message = (
            "נשלח אימייל אימות"
            if sent
            else "לא הצלחנו לשלוח אימייל אימות"
        )
        return Response({"message": message, "verification_email_sent": sent})


class UserForceVerifyView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.edit"

    def post(self, request, user_id):
        user = UserManagementService.get_user(user_id, request.user.default_tenant_id)
        updated = UserManagementService.admin_force_verify(
            user=user, requested_by=request.user, request=request
        )
        return Response(AuthService.serialize_user(updated, request.user.default_tenant_id))


class UserHubView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.view"

    def get(self, request):
        platform_wide = PermissionService.user_has_permission(
            request.user, "tenants.view", request.user.default_tenant_id
        )
        days = min(int(request.query_params.get("days", "7")), 30)
        email = (request.query_params.get("email") or "").strip().lower()
        if email:
            return Response(
                UserHubService.get_email_daily(
                    email=email,
                    tenant_id=request.user.default_tenant_id,
                    platform_wide=platform_wide,
                    days=days,
                )
            )
        return Response(
            UserHubService.get_hub(
                tenant_id=request.user.default_tenant_id,
                platform_wide=platform_wide,
                days=days,
            )
        )


class UserBlockedRegistrationsView(APIView):
    permission_classes = [HasPermission]
    required_permission = "tenants.view"

    def get(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        if email:
            user = UserPurgeService.find_by_email(email)
            if not user:
                return Response({"found": False, "email": email})
            return Response(
                {
                    "found": True,
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "is_active": user.is_active,
                        "email_verified": user.is_email_verified,
                        "deleted_at": user.deleted_at.isoformat() if user.deleted_at else None,
                        "tenant_id": str(user.default_tenant_id) if user.default_tenant_id else None,
                        "tenant_name": user.default_tenant.name if user.default_tenant else None,
                        "created_at": user.created_at.isoformat() if user.created_at else None,
                    },
                }
            )
        limit = min(int(request.query_params.get("limit", "50")), 100)
        unverified = request.query_params.get("unverified", "1") != "0"
        return Response(
            {
                "results": UserPurgeService.list_blocked_registrations(
                    limit=limit,
                    unverified_only=unverified,
                )
            }
        )


class UserPurgeEmailsView(APIView):
    permission_classes = [HasPermission]
    required_permission = "tenants.view"

    def post(self, request):
        emails = request.data.get("emails") or []
        single = (request.data.get("email") or "").strip()
        if single:
            emails = [single, *emails]
        emails = [e.strip().lower() for e in emails if isinstance(e, str) and e.strip()]
        if not emails:
            return Response(
                {"error": {"code": "validation_error", "message": "נדרש לפחות אימייל אחד", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        purge_tenant = request.data.get("purge_tenant") is True
        unverified_only = request.data.get("unverified_only") is True
        results = UserPurgeService.purge_many(
            emails=emails,
            purge_tenant=purge_tenant,
            unverified_only=unverified_only,
            actor=request.user,
            request=request,
        )
        return Response({"results": results})


class UserPurgeByIdView(APIView):
    permission_classes = [HasPermission]
    required_permission = "users.remove"

    def post(self, request, user_id):
        purge_tenant = request.data.get("purge_tenant") is True
        result = UserPurgeService.purge_by_id(
            user_id=user_id,
            tenant_id=request.user.default_tenant_id,
            purge_tenant=purge_tenant,
            actor=request.user,
            request=request,
        )
        if result["status"] == "not_found":
            return Response(
                {"error": {"code": "not_found", "message": "משתמש לא נמצא", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(result)


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
