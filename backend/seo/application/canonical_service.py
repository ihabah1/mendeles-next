from urllib.parse import urljoin

from seo.application.settings_service import SEOSettingsService


class CanonicalService:
    @staticmethod
    def build_url(base_url: str, path: str) -> str:
        base = base_url.rstrip("/")
        normalized = path if path.startswith("/") else f"/{path}"
        return f"{base}{normalized}"

    @classmethod
    def for_page(cls, tenant_id, path: str) -> str:
        settings = SEOSettingsService.get_settings(tenant_id)
        base = settings.get("canonical_base_url") or ""
        if not base:
            return path
        return cls.build_url(base, path)
