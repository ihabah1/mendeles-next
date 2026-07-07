from seo.application.settings_service import SEOSettingsService
from seo.application.site_url import resolve_site_url, sanitize_seo_url


class CanonicalService:
    @staticmethod
    def build_url(base_url: str, path: str) -> str:
        base = resolve_site_url(base_url).rstrip("/")
        normalized = path if path.startswith("/") else f"/{path}"
        return f"{base}{normalized}"

    @classmethod
    def for_page(cls, tenant_id, path: str) -> str:
        settings = SEOSettingsService.get_settings(tenant_id)
        base = resolve_site_url(settings.get("canonical_base_url") or "")
        return sanitize_seo_url(cls.build_url(base, path), base)
