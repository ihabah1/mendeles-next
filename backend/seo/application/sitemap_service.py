from django.utils import timezone

from seo.application.canonical_service import CanonicalService
from seo.application.settings_service import SEOSettingsService
from seo.infrastructure.models import SEOSlug


# Static marketing pages — extensible registry for sitemap generation.
STATIC_PAGES = [
    {"path": "/", "changefreq": "weekly", "priority": 1.0},
    {"path": "/solutions", "changefreq": "weekly", "priority": 0.9},
    {"path": "/industries", "changefreq": "weekly", "priority": 0.9},
    {"path": "/company", "changefreq": "monthly", "priority": 0.7},
    {"path": "/blog", "changefreq": "weekly", "priority": 0.8},
    {"path": "/accessibility", "changefreq": "monthly", "priority": 0.5},
    {"path": "/login", "changefreq": "yearly", "priority": 0.3},
    {"path": "/register", "changefreq": "yearly", "priority": 0.3},
    {"path": "/forgot-password", "changefreq": "yearly", "priority": 0.2},
    {"path": "/reset-password", "changefreq": "yearly", "priority": 0.2},
    {"path": "/verify-email", "changefreq": "yearly", "priority": 0.2},
]

SOLUTION_SLUGS = [
    "generate-leads",
    "seo-landing-pages",
    "marketing-automation",
    "ai-qualification",
    "lead-management",
    "analytics",
]

INDUSTRY_SLUGS = [
    "electricians",
    "plumbers",
    "lawyers",
    "insurance",
    "mortgage",
    "solar",
    "medical-clinics",
    "dentists",
    "real-estate",
    "education",
    "agencies",
    "affiliate-marketers",
]

LOCALES = ["he", "en"]


class SitemapService:
    """Scalable sitemap engine — static now, hooks for future dynamic content."""

    @classmethod
    def _entry(cls, tenant_id, path: str, *, changefreq: str, priority: float, locale: str) -> dict:
        localized_path = path if locale == "he" else f"/{locale}{path if path != '/' else ''}"
        if locale == "en" and path == "/":
            localized_path = "/en"
        return {
            "loc": CanonicalService.for_page(tenant_id, localized_path),
            "lastmod": timezone.now().date().isoformat(),
            "changefreq": changefreq,
            "priority": priority,
            "locale": locale,
        }

    @classmethod
    def static_entries(cls, tenant_id) -> list[dict]:
        entries = []
        for page in STATIC_PAGES:
            for locale in LOCALES:
                entries.append(
                    cls._entry(
                        tenant_id,
                        page["path"],
                        changefreq=page["changefreq"],
                        priority=page["priority"],
                        locale=locale,
                    )
                )
        for slug in SOLUTION_SLUGS:
            for locale in LOCALES:
                path = f"/solutions/{slug}"
                entries.append(cls._entry(tenant_id, path, changefreq="monthly", priority=0.8, locale=locale))
        for slug in INDUSTRY_SLUGS:
            for locale in LOCALES:
                path = f"/industries/{slug}"
                entries.append(cls._entry(tenant_id, path, changefreq="monthly", priority=0.8, locale=locale))
        return entries

    @classmethod
    def dynamic_entries(cls, tenant_id, content_type: str) -> list[dict]:
        """Future: landing pages, blog, templates, resources."""
        slugs = SEOSlug.objects.filter(
            tenant_id=tenant_id,
            content_type=content_type,
            deleted_at__isnull=True,
        )
        entries = []
        for slug_obj in slugs:
            path = slug_obj.path or f"/{slug_obj.slug}"
            entries.append(
                cls._entry(tenant_id, path, changefreq="weekly", priority=0.7, locale=slug_obj.locale)
            )
        return entries

    @classmethod
    def collect_all(cls, tenant_id) -> list[dict]:
        entries = cls.static_entries(tenant_id)
        for content_type in (
            SEOSlug.ContentType.LANDING_PAGE,
            SEOSlug.ContentType.BLOG,
            SEOSlug.ContentType.INDUSTRY,
            SEOSlug.ContentType.TEMPLATE,
            SEOSlug.ContentType.RESOURCE,
        ):
            entries.extend(cls.dynamic_entries(tenant_id, content_type))
        return entries
