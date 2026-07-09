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
    "features.contact_widget_home": "true",
}

PUBLIC_FEATURE_KEYS = ("features.contact_widget_home",)


def _setting_bool(value: str | None, *, default: bool = True) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() not in {"false", "0", "no", "off"}


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

    @staticmethod
    def get_public_features(tenant_id) -> dict:
        if not tenant_id:
            return {"contact_widget_home": True}
        settings = SettingsService.get_tenant_settings(tenant_id)
        return {
            "contact_widget_home": _setting_bool(
                settings.get("features.contact_widget_home"),
                default=True,
            ),
        }
