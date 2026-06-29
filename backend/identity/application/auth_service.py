import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from audit.application.audit_service import AuditService
from core.exceptions.base import ConflictError, UnauthorizedError, ValidationError
from identity.infrastructure.email_service import EmailService
from identity.infrastructure.jwt import JWTService, TokenHasher
from identity.infrastructure.models import EmailVerificationToken, PasswordResetToken
from rbac.application.permission_service import PermissionService
from rbac.infrastructure.models import Role, UserRole
from tenancy.domain.services import slugify_tenant_name
from tenancy.infrastructure.models import Tenant

User = get_user_model()


def _client_meta(request) -> tuple[str | None, str]:
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get(
        "REMOTE_ADDR"
    )
    ua = request.META.get("HTTP_USER_AGENT", "")
    return ip, ua


class AuthService:
    @staticmethod
    @transaction.atomic
    def register(
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        tenant_name: str,
        request,
    ) -> User:
        email = email.strip().lower()
        if User.objects.filter(email=email, deleted_at__isnull=True).exists():
            raise ConflictError("כתובת האימייל כבר רשומה במערכת")

        base_slug = slugify_tenant_name(tenant_name)
        slug = base_slug
        if not slug or Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug or 'tenant'}-{uuid.uuid4().hex[:8]}"

        tenant = Tenant.objects.create(name=tenant_name.strip(), slug=slug)
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            default_tenant=tenant,
        )

        owner_role = Role.objects.get(slug="business_owner", tenant__isnull=True, is_system=True)
        UserRole.objects.create(user=user, role=owner_role, tenant=tenant)

        raw_token = TokenHasher.generate_raw_token()
        EmailVerificationToken.objects.create(
            user=user,
            token_hash=TokenHasher.hash_token(raw_token),
            expires_at=timezone.now() + settings.EMAIL_VERIFICATION_TTL,
        )
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
        EmailService.send_verification_email(to_email=user.email, verify_url=verify_url)

        ip, ua = _client_meta(request)
        AuditService.log(
            action="user.registered",
            user=user,
            tenant_id=tenant.id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip,
            user_agent=ua,
        )
        return user

    @staticmethod
    def login(*, email: str, password: str, request) -> dict:
        email = email.strip().lower()
        user = User.objects.filter(email=email, deleted_at__isnull=True).first()
        if not user or not user.check_password(password):
            raise UnauthorizedError("אימייל או סיסמה שגויים")
        if not user.is_active:
            raise UnauthorizedError("החשבון אינו פעיל")
        if not user.is_email_verified and not user.is_superuser:
            raise UnauthorizedError("יש לאמת את כתובת האימייל לפני ההתחברות")

        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at", "updated_at"])

        tenant_id = user.default_tenant_id
        ip, ua = _client_meta(request)
        access = JWTService.create_access_token(user, tenant_id)
        refresh, _record = JWTService.create_refresh_token(user, ip_address=ip, user_agent=ua)

        AuditService.log(
            action="auth.login",
            user=user,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
        )

        return {
            "access": access,
            "refresh": refresh,
            "expires_in": int(settings.JWT_ACCESS_TTL.total_seconds()),
            "user": AuthService.serialize_user(user, tenant_id),
        }

    @staticmethod
    def refresh(*, refresh_token: str, request) -> dict:
        payload = JWTService.decode_refresh_token(refresh_token)
        user = User.objects.filter(pk=payload["sub"], deleted_at__isnull=True, is_active=True).first()
        if not user:
            raise UnauthorizedError("משתמש לא נמצא")
        if not user.is_email_verified and not user.is_superuser:
            raise UnauthorizedError("יש לאמת את כתובת האימייל")

        ip, ua = _client_meta(request)
        new_refresh, _ = JWTService.rotate_refresh_token(payload["jti"], user, ip_address=ip, user_agent=ua)
        tenant_id = user.default_tenant_id
        access = JWTService.create_access_token(user, tenant_id)

        return {
            "access": access,
            "refresh": new_refresh,
            "expires_in": int(settings.JWT_ACCESS_TTL.total_seconds()),
        }

    @staticmethod
    def logout(*, refresh_token: str | None, user: User | None, request) -> None:
        if refresh_token:
            try:
                payload = JWTService.decode_refresh_token(refresh_token)
                JWTService.revoke_refresh_token(payload["jti"], user)
            except UnauthorizedError:
                pass
        if user and user.is_authenticated:
            ip, ua = _client_meta(request)
            AuditService.log(
                action="auth.logout",
                user=user,
                tenant_id=user.default_tenant_id,
                ip_address=ip,
                user_agent=ua,
            )

    @staticmethod
    def verify_email(*, token: str, request) -> None:
        token_hash = TokenHasher.hash_token(token)
        record = (
            EmailVerificationToken.objects.select_related("user")
            .filter(token_hash=token_hash, used_at__isnull=True)
            .first()
        )
        if not record or record.expires_at < timezone.now():
            raise ValidationError("קישור האימות אינו תקף או שפג תוקפו")

        user = record.user
        user.email_verified_at = timezone.now()
        user.save(update_fields=["email_verified_at", "updated_at"])
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])

        ip, ua = _client_meta(request)
        AuditService.log(
            action="user.email_verified",
            user=user,
            tenant_id=user.default_tenant_id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip,
            user_agent=ua,
        )

    @staticmethod
    def forgot_password(*, email: str, request) -> None:
        user = User.objects.filter(email=email.strip().lower(), deleted_at__isnull=True).first()
        if not user:
            return
        raw = TokenHasher.generate_raw_token()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=TokenHasher.hash_token(raw),
            expires_at=timezone.now() + settings.PASSWORD_RESET_TTL,
        )
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw}"
        EmailService.send_password_reset_email(to_email=user.email, reset_url=reset_url)

    @staticmethod
    def reset_password(*, token: str, password: str, request) -> None:
        token_hash = TokenHasher.hash_token(token)
        record = (
            PasswordResetToken.objects.select_related("user")
            .filter(token_hash=token_hash, used_at__isnull=True)
            .first()
        )
        if not record or record.expires_at < timezone.now():
            raise ValidationError("קישור איפוס הסיסמה אינו תקף")

        user = record.user
        user.set_password(password)
        user.save(update_fields=["password", "updated_at"])
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])

        from identity.infrastructure.models import RefreshToken

        RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=timezone.now()
        )

        ip, ua = _client_meta(request)
        AuditService.log(
            action="user.password_reset",
            user=user,
            tenant_id=user.default_tenant_id,
            resource_type="user",
            resource_id=user.id,
            ip_address=ip,
            user_agent=ua,
        )

    @staticmethod
    def serialize_user(user: User, tenant_id=None) -> dict:
        tid = tenant_id or user.default_tenant_id
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "tenant_id": str(tid) if tid else None,
            "roles": PermissionService.get_user_roles(user, tid),
            "permissions": sorted(PermissionService.get_user_permissions(user, tid)),
            "preferred_locale": user.preferred_locale,
            "email_verified": user.is_email_verified,
        }
