"""In-app and email notification preparation."""

from django.utils import timezone

from automation.domain.enums import NotificationChannel, NotificationType
from automation.infrastructure.models import AutomationJob, AutomationNotification


class NotificationService:
    @staticmethod
    def notify(
        *,
        job: AutomationJob,
        user,
        notification_type: str,
        title: str,
        body: str = "",
        channel: str = NotificationChannel.IN_APP,
    ) -> AutomationNotification:
        notification = AutomationNotification.objects.create(
            tenant_id=job.tenant_id,
            user=user,
            job=job,
            channel=channel,
            notification_type=notification_type,
            title=title,
            body=body,
            sent_at=timezone.now() if channel == NotificationChannel.IN_APP else None,
        )
        return notification

    @staticmethod
    def list_for_user(tenant_id, user, *, unread_only: bool = False):
        qs = AutomationNotification.objects.filter(
            tenant_id=tenant_id,
            user=user,
            deleted_at__isnull=True,
        ).select_related("job")
        if unread_only:
            qs = qs.filter(read_at__isnull=True)
        return qs.order_by("-created_at")

    @staticmethod
    def mark_read(notification_id, user):
        AutomationNotification.objects.filter(id=notification_id, user=user).update(read_at=timezone.now())
