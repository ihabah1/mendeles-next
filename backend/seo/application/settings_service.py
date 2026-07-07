from django.conf import settings

from seo.application.defaults import default_settings_for_tenant, needs_default_seed
from seo.application.site_url import resolve_site_url, sanitize_seo_url
from seo.infrastructure.models import SEOGlobalSettings
from tenancy.infrastructure.models import Tenant


class SEOSettingsService:
    EDITABLE_FIELDS = (
        "site_name",
        "default_title",
        "default_description",
        "default_keywords",
        "default_author",
        "default_language",
        "robots_policy",
        "canonical_base_url",
        "default_og_image",
        "default_twitter_image",
        "organization_name",
        "organization_logo",
        "organization_url",
    )

    @staticmethod
    def get_or_create(tenant_id) -> SEOGlobalSettings:
        obj, created = SEOGlobalSettings.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={
                "canonical_base_url": getattr(settings, "FRONTEND_URL", ""),
                "default_language": "he",
            },
        )
        if created:
            SEOSettingsService.seed_defaults(tenant_id, force=True)
            obj.refresh_from_db()
        return obj

    @classmethod
    def seed_defaults(cls, tenant_id, *, force: bool = False) -> SEOGlobalSettings:
        obj = SEOGlobalSettings.objects.filter(tenant_id=tenant_id).first()
        if obj is None:
            obj = cls.get_or_create(tenant_id)
        if not force and not needs_default_seed(obj):
            return obj

        tenant = Tenant.objects.get(pk=tenant_id)
        defaults = default_settings_for_tenant(tenant, language=obj.default_language or "he")
        changed = False
        for field in cls.EDITABLE_FIELDS:
            if force or not getattr(obj, field, ""):
                value = defaults.get(field, "")
                if value and getattr(obj, field, "") != value:
                    setattr(obj, field, value)
                    changed = True
        if changed:
            obj.save()
        return obj

    @classmethod
    def get_settings(cls, tenant_id) -> dict:
        obj = cls.get_or_create(tenant_id)
        if needs_default_seed(obj):
            obj = cls.seed_defaults(tenant_id)
        data = obj.to_dict()
        base = resolve_site_url(data.get("canonical_base_url") or "")
        data["canonical_base_url"] = base
        if data.get("organization_url"):
            data["organization_url"] = sanitize_seo_url(data["organization_url"], base)
        else:
            data["organization_url"] = base
        return data

    @classmethod
    def update_settings(cls, tenant_id, updates: dict) -> dict:
        obj = cls.get_or_create(tenant_id)
        for field in cls.EDITABLE_FIELDS:
            if field in updates:
                setattr(obj, field, updates[field])
        obj.save()
        return obj.to_dict()
