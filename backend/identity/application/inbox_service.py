"""User inbox messaging."""

from django.utils import timezone

from audit.application.audit_service import AuditService
from identity.infrastructure.models import User, UserInboxMessage


class InboxService:
    @staticmethod
    def list_for_user(*, tenant_id, user, unread_only: bool = False):
        qs = UserInboxMessage.objects.filter(
            tenant_id=tenant_id,
            recipient=user,
        ).select_related("sender")
        if unread_only:
            qs = qs.filter(read_at__isnull=True)
        return qs.order_by("-created_at")

    @staticmethod
    def unread_count(*, tenant_id, user) -> int:
        return UserInboxMessage.objects.filter(
            tenant_id=tenant_id,
            recipient=user,
            read_at__isnull=True,
        ).count()

    @staticmethod
    def mark_read(*, message_id, user) -> None:
        UserInboxMessage.objects.filter(id=message_id, recipient=user).update(
            read_at=timezone.now()
        )

    @staticmethod
    def send_message(
        *,
        tenant_id,
        sender: User | None,
        recipient: User,
        subject: str,
        body: str,
        request,
    ) -> UserInboxMessage:
        message = UserInboxMessage.objects.create(
            tenant_id=tenant_id,
            sender=sender,
            recipient=recipient,
            subject=subject.strip(),
            body=body.strip(),
        )
        AuditService.log(
            action="inbox.message_sent",
            user=sender,
            tenant_id=tenant_id,
            resource_type="inbox_message",
            resource_id=message.id,
            metadata={"recipient_id": str(recipient.id), "subject": subject},
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return message

    @staticmethod
    def broadcast(
        *,
        tenant_id,
        sender: User,
        subject: str,
        body: str,
        request,
        recipient_ids: list | None = None,
    ) -> int:
        users = User.objects.filter(default_tenant_id=tenant_id, deleted_at__isnull=True, is_active=True)
        if recipient_ids:
            users = users.filter(id__in=recipient_ids)
        count = 0
        for recipient in users:
            InboxService.send_message(
                tenant_id=tenant_id,
                sender=sender,
                recipient=recipient,
                subject=subject,
                body=body,
                request=request,
            )
            count += 1
        return count
