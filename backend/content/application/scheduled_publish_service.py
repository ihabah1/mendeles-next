from django.utils import timezone

from content.application.publish_service import PublishService
from content.domain.status import PageStatus
from content.infrastructure.models import Page


class ScheduledPublishService:
    """Publishes pages whose scheduled_at has passed."""

    @classmethod
    def process_due_pages(cls) -> list[str]:
        now = timezone.now()
        due = Page.objects.filter(
            status=PageStatus.SCHEDULED,
            scheduled_at__lte=now,
            deleted_at__isnull=True,
        ).select_related("updated_by")

        published_ids: list[str] = []
        for page in due:
            user = page.updated_by or page.created_by
            if not user:
                continue
            PublishService.publish(page.tenant_id, page.id, user, change_summary="Scheduled publish")
            published_ids.append(str(page.id))
        return published_ids
