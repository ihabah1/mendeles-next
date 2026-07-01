from django.conf import settings

from seo.infrastructure.models import SEOGlobalSettings


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
        obj, _ = SEOGlobalSettings.objects.get_or_create(
            tenant_id=tenant_id,
            defaults={
                "canonical_base_url": getattr(settings, "FRONTEND_URL", ""),
                "default_language": "he",
            },
        )
        return obj

    @classmethod
    def get_settings(cls, tenant_id) -> dict:
        return cls.get_or_create(tenant_id).to_dict()

    @classmethod
    def update_settings(cls, tenant_id, updates: dict) -> dict:
        obj = cls.get_or_create(tenant_id)
        for field in cls.EDITABLE_FIELDS:
            if field in updates:
                setattr(obj, field, updates[field])
        obj.save()
        return obj.to_dict()
