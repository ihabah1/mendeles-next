from django.conf import settings as django_settings

from seo.application.site_url import resolve_site_url
from tenancy.infrastructure.models import Tenant

BRAND_NAME = "Mendeles"

_COPY = {
    "he": {
        "default_title": "Mendeles — פלטפורמת לידים מבוססת AI",
        "default_description": (
            "הפכו חיפושים בגוגל ללקוחות מוכשרים. "
            "דפי נחיתה ל-SEO, סינון לידים ב-AI ואוטומציה שיווקית לעסקים צומחים."
        ),
        "default_keywords": "לידים, SEO, דפי נחיתה, שיווק דיגיטלי, Mendeles",
    },
    "en": {
        "default_title": "Mendeles — AI Lead Generation Platform",
        "default_description": (
            "Turn Google searches into qualified leads. "
            "SEO landing pages, AI lead qualification, and marketing automation for growing businesses."
        ),
        "default_keywords": "leads, SEO, landing pages, digital marketing, Mendeles",
    },
}


def _site_name_for_tenant(tenant: Tenant) -> str:
    if tenant.slug in {"platform", "mendeles"}:
        return BRAND_NAME
    return (tenant.name or BRAND_NAME).strip() or BRAND_NAME


def default_settings_for_tenant(tenant: Tenant, *, language: str = "he") -> dict:
    copy = _COPY.get(language, _COPY["he"])
    base_url = resolve_site_url(django_settings.FRONTEND_URL)
    site_name = _site_name_for_tenant(tenant)

    return {
        "site_name": site_name,
        "default_title": copy["default_title"],
        "default_description": copy["default_description"],
        "default_keywords": copy["default_keywords"],
        "default_author": site_name,
        "default_language": language,
        "robots_policy": "index,follow",
        "canonical_base_url": base_url,
        "default_og_image": "",
        "default_twitter_image": "",
        "organization_name": site_name,
        "organization_logo": "",
        "organization_url": base_url,
    }


def needs_default_seed(settings_obj) -> bool:
    """True when SEO was never configured (all core fields empty)."""
    return not any(
        [
            settings_obj.site_name,
            settings_obj.default_title,
            settings_obj.default_description,
            settings_obj.organization_name,
        ]
    )
