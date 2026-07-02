from django.core.management.base import BaseCommand

from seo.application.settings_service import SEOSettingsService
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Seed default SEO settings for tenants that were never configured."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite empty fields even when some SEO values already exist.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        count = 0
        for tenant in Tenant.objects.filter(deleted_at__isnull=True):
            before = SEOSettingsService.get_or_create(tenant.id)
            was_empty = not before.site_name
            SEOSettingsService.seed_defaults(tenant.id, force=force)
            after = SEOSettingsService.get_or_create(tenant.id)
            if was_empty or force:
                count += 1
            self.stdout.write(f"  {tenant.slug}: {after.site_name or '(unchanged)'}")
        self.stdout.write(self.style.SUCCESS(f"SEO defaults applied for {count} tenant(s)."))
