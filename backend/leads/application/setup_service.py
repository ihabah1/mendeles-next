"""Ensure default lead sources and contact form exist for a tenant."""

from __future__ import annotations

from leads.infrastructure.models import FormDefinition, LeadSource

DEFAULT_SOURCES = [
    ("landing_page_form", "טופס דף נחיתה"),
    ("manual", "ידני"),
    ("api", "API"),
    ("import", "ייבוא"),
    ("contact_widget", "טופס יצירת קשר"),
]

DEFAULT_CONTACT_FORM = {
    "name": "טופס יצירת קשר",
    "slug": "contact",
    "fields_schema": [
        {"key": "name", "label": "שם", "required": True},
        {"key": "phone", "label": "טלפון", "required": False},
        {"key": "email", "label": "אימייל", "required": True},
        {"key": "message", "label": "הודעה", "required": False},
    ],
}


class LeadSetupService:
    @staticmethod
    def ensure_sources(tenant_id) -> None:
        for slug, name in DEFAULT_SOURCES:
            LeadSource.objects.update_or_create(
                tenant_id=tenant_id,
                slug=slug,
                defaults={"name": name, "is_system": True},
            )

    @staticmethod
    def ensure_contact_form(tenant_id) -> FormDefinition:
        LeadSetupService.ensure_sources(tenant_id)
        form, _ = FormDefinition.objects.update_or_create(
            tenant_id=tenant_id,
            slug=DEFAULT_CONTACT_FORM["slug"],
            defaults={
                "name": DEFAULT_CONTACT_FORM["name"],
                "fields_schema": DEFAULT_CONTACT_FORM["fields_schema"],
                "spam_protection": {"honeypot": True, "rate_limit": 5},
                "duplicate_policy": "allow",
            },
        )
        if form.deleted_at:
            form.deleted_at = None
            form.save(update_fields=["deleted_at", "updated_at"])
        return form

    @staticmethod
    def get_or_create_public_contact_form(tenant_id) -> FormDefinition:
        existing = (
            FormDefinition.objects.filter(tenant_id=tenant_id, slug="contact", deleted_at__isnull=True).first()
            or FormDefinition.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("created_at").first()
        )
        if existing:
            LeadSetupService.ensure_sources(tenant_id)
            return existing
        return LeadSetupService.ensure_contact_form(tenant_id)
