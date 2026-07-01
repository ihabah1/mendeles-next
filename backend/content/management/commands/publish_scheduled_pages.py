from django.core.management.base import BaseCommand

from content.application.scheduled_publish_service import ScheduledPublishService


class Command(BaseCommand):
    help = "Publish content pages whose scheduled_at datetime has passed"

    def handle(self, *args, **options):
        published = ScheduledPublishService.process_due_pages()
        self.stdout.write(self.style.SUCCESS(f"Published {len(published)} scheduled page(s)"))
