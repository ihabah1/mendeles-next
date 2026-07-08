"""Hard-delete users so their email can be reused for registration."""

from django.contrib.auth import get_user_model
from django.db import transaction

from audit.infrastructure.models import AuditLog
from identity.infrastructure.models import (
    EmailVerificationToken,
    PasswordResetToken,
    RefreshToken,
    UserInboxMessage,
)
from rbac.infrastructure.models import UserRole

User = get_user_model()


def _serialize_user_row(user: User) -> dict:
    return {
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
    }


class UserPurgeService:
    @staticmethod
    def find_by_email(email: str) -> User | None:
        email = email.strip().lower()
        user = User.objects.filter(email__iexact=email).select_related("default_tenant").first()
        if user:
            return user
        return (
            User.objects.filter(email__icontains=f".{email}", deleted_at__isnull=False)
            .select_related("default_tenant")
            .first()
        )

    @staticmethod
    def list_blocked_registrations(*, limit: int = 50, unverified_only: bool = True) -> list[dict]:
        qs = User.objects.select_related("default_tenant").order_by("-created_at")
        if unverified_only:
            qs = qs.filter(email_verified_at__isnull=True)
        rows = []
        for user in qs[:limit]:
            rows.append(_serialize_user_row(user))
        return rows

    @staticmethod
    @transaction.atomic
    def purge_by_email(
        *,
        email: str,
        purge_tenant: bool = False,
        unverified_only: bool = False,
        actor=None,
        request=None,
    ) -> dict:
        email = email.strip().lower()
        user = UserPurgeService.find_by_email(email)
        if not user:
            return {"email": email, "status": "not_found"}

        if unverified_only and user.is_email_verified:
            return {"email": email, "status": "skipped_verified", "user_id": str(user.id)}

        original_email = email if "@" in user.email and not user.email.startswith("deleted.") else user.email
        tenant = user.default_tenant
        tenant_id = tenant.id if tenant else None
        user_id = user.id

        UserRole.objects.filter(user=user).delete()
        EmailVerificationToken.objects.filter(user=user).delete()
        PasswordResetToken.objects.filter(user=user).delete()
        RefreshToken.objects.filter(user=user).delete()
        UserInboxMessage.objects.filter(recipient=user).delete()
        UserInboxMessage.objects.filter(sender=user).delete()
        AuditLog.objects.filter(user=user).update(user=None)

        user.delete()

        tenant_deleted = False
        if purge_tenant and tenant_id:
            remaining = User.objects.filter(default_tenant_id=tenant_id).count()
            if remaining == 0:
                from tenancy.infrastructure.models import Tenant

                Tenant.objects.filter(id=tenant_id).delete()
                tenant_deleted = True

        if actor and request:
            from audit.application.audit_service import AuditService

            AuditService.log(
                action="user.purged",
                user=actor,
                tenant_id=actor.default_tenant_id,
                resource_type="user",
                resource_id=user_id,
                metadata={
                    "email": original_email,
                    "tenant_purged": tenant_deleted,
                    "purge_tenant": purge_tenant,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return {
            "email": original_email,
            "status": "purged",
            "user_id": str(user_id),
            "tenant_purged": tenant_deleted,
        }

    @staticmethod
    @transaction.atomic
    def purge_many(
        *,
        emails: list[str],
        purge_tenant: bool = False,
        unverified_only: bool = False,
        actor=None,
        request=None,
    ) -> list[dict]:
        results = []
        for email in emails:
            results.append(
                UserPurgeService.purge_by_email(
                    email=email,
                    purge_tenant=purge_tenant,
                    unverified_only=unverified_only,
                    actor=actor,
                    request=request,
                )
            )
        return results

    @staticmethod
    @transaction.atomic
    def purge_by_id(
        *,
        user_id,
        tenant_id,
        purge_tenant: bool = False,
        actor=None,
        request=None,
    ) -> dict:
        user = User.objects.filter(pk=user_id, default_tenant_id=tenant_id).select_related("default_tenant").first()
        if not user:
            return {"status": "not_found", "user_id": str(user_id)}
        return UserPurgeService.purge_by_email(
            email=user.email,
            purge_tenant=purge_tenant,
            actor=actor,
            request=request,
        )
