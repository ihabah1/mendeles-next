from django.core.management.base import BaseCommand

from leads.application.setup_service import LeadSetupService
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Seed lead sources and default contact form per tenant."

    def handle(self, *args, **options):
        for tenant in Tenant.objects.filter(deleted_at__isnull=True):
            LeadSetupService.ensure_contact_form(tenant.id)
        self.stdout.write(self.style.SUCCESS("Lead sources and forms seeded."))
