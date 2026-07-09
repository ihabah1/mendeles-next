from __future__ import annotations

import os

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

FEATURE_FLAG_DEFINITIONS = [
    {
        "key": "features.contact_widget_home",
        "slug": "contact_widget_home",
        "default": True,
    },
]


def _setting_bool(value: str | None, *, default: bool = True) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() not in {"false", "0", "no", "off"}


def _first_non_empty(*values: str | None) -> str:
    for value in values:
        if value and str(value).strip():
            return str(value).strip()
    return ""


def _whatsapp_number_from_env() -> str:
    direct = _first_non_empty(
        os.environ.get("WHATSAPP_NUMBER"),
        os.environ.get("NEXT_PUBLIC_WHATSAPP_NUMBER"),
        os.environ.get("PUBLIC_WHATSAPP_NUMBER"),
    )
    if direct:
        return direct.replace("whatsapp:", "").strip()
    twilio_from = os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()
    if twilio_from:
        return twilio_from.replace("whatsapp:", "").strip()
    return ""


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
            settings = {}
        else:
            settings = SettingsService.get_tenant_settings(tenant_id)

        email = _first_non_empty(
            os.environ.get("CONTACT_EMAIL"),
            os.environ.get("PUBLIC_CONTACT_EMAIL"),
            settings.get("company.email"),
            "mendelessupport@gmail.com",
        )
        if "<" in email and ">" in email:
            email = email.split("<", 1)[1].split(">", 1)[0].strip()

        phone = _first_non_empty(
            os.environ.get("CONTACT_PHONE"),
            os.environ.get("PUBLIC_CONTACT_PHONE"),
            settings.get("company.phone"),
        )
        whatsapp_number = _whatsapp_number_from_env() or "972537985362"
        whatsapp_prefill = _first_non_empty(
            os.environ.get("WHATSAPP_PREFILL"),
            os.environ.get("PUBLIC_WHATSAPP_PREFILL"),
            "שלום Mendeles",
        )

        return {
            "contact_widget_home": _setting_bool(
                settings.get("features.contact_widget_home"),
                default=True,
            ),
            "contact_email": email,
            "contact_phone": phone,
            "whatsapp_number": whatsapp_number,
            "whatsapp_prefill": whatsapp_prefill,
        }
