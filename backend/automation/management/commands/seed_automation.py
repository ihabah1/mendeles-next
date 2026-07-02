from django.core.management.base import BaseCommand

from automation.infrastructure.models import AutomationQueue
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Seed default automation queue per tenant"

    def handle(self, *args, **options):
        count = 0
        for tenant in Tenant.objects.filter(deleted_at__isnull=True):
            _, created = AutomationQueue.objects.get_or_create(
                tenant=tenant,
                slug="default",
                defaults={"name": "Default Queue", "is_default": True},
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {count} automation queue(s)."))
