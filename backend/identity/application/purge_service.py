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


class UserPurgeService:
    @staticmethod
    @transaction.atomic
    def purge_by_email(*, email: str, purge_tenant: bool = False) -> dict:
        email = email.strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(email__icontains=email, deleted_at__isnull=False).first()
        if not user:
            return {"email": email, "status": "not_found"}

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

        return {
            "email": email,
            "status": "purged",
            "user_id": str(user_id),
            "tenant_purged": tenant_deleted,
        }
