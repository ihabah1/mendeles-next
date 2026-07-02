from django.core.management.base import BaseCommand

from leads.infrastructure.models import FormDefinition, LeadSource
from tenancy.infrastructure.models import Tenant


DEFAULT_SOURCES = [
    ("landing_page_form", "טופס דף נחיתה"),
    ("manual", "ידני"),
    ("api", "API"),
    ("import", "ייבוא"),
]

DEFAULT_FORM = {
    "name": "טופס יצירת קשר",
    "slug": "contact",
    "fields_schema": [
        {"key": "name", "label": "שם", "required": True},
        {"key": "phone", "label": "טלפון", "required": False},
        {"key": "email", "label": "אימייל", "required": True},
        {"key": "message", "label": "הודעה", "required": False},
    ],
}


class Command(BaseCommand):
    help = "Seed lead sources and default contact form per tenant."

    def handle(self, *args, **options):
        for tenant in Tenant.objects.filter(deleted_at__isnull=True):
            for slug, name in DEFAULT_SOURCES:
                LeadSource.objects.update_or_create(
                    tenant=tenant,
                    slug=slug,
                    defaults={"name": name, "is_system": True},
                )
            FormDefinition.objects.update_or_create(
                tenant=tenant,
                slug=DEFAULT_FORM["slug"],
                defaults={
                    "name": DEFAULT_FORM["name"],
                    "fields_schema": DEFAULT_FORM["fields_schema"],
                    "spam_protection": {"honeypot": True, "rate_limit": 5},
                },
            )
        self.stdout.write(self.style.SUCCESS("Lead sources and forms seeded."))
