from siteconfig.infrastructure.models import SystemSetting

DEFAULT_SETTINGS = {
    "company.name": "",
    "company.logo_url": "",
    "company.phone": "",
    "company.email": "",
    "brand.primary_color": "#18181b",
    "brand.secondary_color": "#3f3f46",
    "social.facebook": "",
    "social.instagram": "",
    "social.linkedin": "",
    "analytics.ga_id": "",
    "analytics.gtm_id": "",
    "analytics.fb_pixel": "",
}


class SettingsService:
    @staticmethod
    def get_tenant_settings(tenant_id) -> dict:
        stored = {
            s.key: s.value
            for s in SystemSetting.objects.filter(tenant_id=tenant_id)
        }
        merged = {**DEFAULT_SETTINGS, **stored}
        return merged

    @staticmethod
    def update_tenant_settings(tenant_id, updates: dict, user) -> dict:
        for key, value in updates.items():
            if key not in DEFAULT_SETTINGS:
                continue
            obj, _ = SystemSetting.objects.update_or_create(
                tenant_id=tenant_id,
                key=key,
                defaults={"value": value, "updated_by": user},
            )
        return SettingsService.get_tenant_settings(tenant_id)
