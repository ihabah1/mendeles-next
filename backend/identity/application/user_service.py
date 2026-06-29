from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from audit.application.audit_service import AuditService
from core.exceptions.base import ConflictError, NotFoundError
from identity.infrastructure.email_service import EmailService
from identity.infrastructure.jwt import TokenHasher
from identity.infrastructure.models import PasswordResetToken
from rbac.infrastructure.models import Role, UserRole

User = get_user_model()


class UserManagementService:
    @staticmethod
    def list_users(tenant_id):
        return User.objects.filter(default_tenant_id=tenant_id, deleted_at__isnull=True).order_by(
            "-created_at"
        )

    @staticmethod
    def get_user(user_id, tenant_id):
        user = User.objects.filter(
            pk=user_id, default_tenant_id=tenant_id, deleted_at__isnull=True
        ).first()
        if not user:
            raise NotFoundError("משתמש לא נמצא")
        return user

    @staticmethod
    @transaction.atomic
    def invite_user(*, email: str, first_name: str, last_name: str, role_slug: str, tenant, invited_by, request):
        email = email.strip().lower()
        if User.objects.filter(email=email, deleted_at__isnull=True).exists():
            raise ConflictError("כתובת האימייל כבר רשומה")

        user = User.objects.create_user(
            email=email,
            password=User.objects.make_random_password(length=32),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            default_tenant=tenant,
            is_active=True,
        )
        role = Role.objects.filter(slug=role_slug, deleted_at__isnull=True).filter(
            Q(tenant=tenant) | Q(tenant__isnull=True, is_system=True)
        ).first()
        if not role:
            from core.exceptions.base import ValidationError

            raise ValidationError("תפקיד לא תקין")

        UserRole.objects.create(user=user, role=role, tenant=tenant, assigned_by=invited_by)

        raw = TokenHasher.generate_raw_token()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=TokenHasher.hash_token(raw),
            expires_at=timezone.now() + settings.PASSWORD_RESET_TTL,
        )
        invite_url = f"{settings.FRONTEND_URL}/reset-password?token={raw}"
        EmailService.send_user_invite_email(to_email=email, invite_url=invite_url)

        ip = request.META.get("REMOTE_ADDR")
        ua = request.META.get("HTTP_USER_AGENT", "")
        AuditService.log(
            action="user.invited",
            user=invited_by,
            tenant_id=tenant.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"email": email, "role": role_slug},
            ip_address=ip,
            user_agent=ua,
        )
        return user

    @staticmethod
    def update_user(user: User, data: dict, updated_by, request) -> User:
        allowed = {"first_name", "last_name", "phone", "preferred_locale", "is_active"}
        for key, value in data.items():
            if key in allowed:
                setattr(user, key, value)
        user.save()
        ip = request.META.get("REMOTE_ADDR")
        AuditService.log(
            action="user.updated",
            user=updated_by,
            tenant_id=user.default_tenant_id,
            resource_type="user",
            resource_id=user.id,
            metadata=data,
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return user

    @staticmethod
    def soft_delete_user(user: User, deleted_by, request) -> None:
        user.soft_delete()
        ip = request.META.get("REMOTE_ADDR")
        AuditService.log(
            action="user.removed",
            user=deleted_by,
            tenant_id=user.default_tenant_id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
