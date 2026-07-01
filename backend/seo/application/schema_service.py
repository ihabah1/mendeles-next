from seo.application.breadcrumb_service import BreadcrumbService
from seo.application.settings_service import SEOSettingsService


class SchemaService:
    """Schema.org JSON-LD generator — extensible for future content types."""

    # --- Implemented schemas ---

    @classmethod
    def organization(cls, tenant_id) -> dict:
        settings = SEOSettingsService.get_settings(tenant_id)
        org_name = settings.get("organization_name") or settings.get("site_name") or ""
        org_url = settings.get("organization_url") or settings.get("canonical_base_url") or ""
        logo = settings.get("organization_logo") or ""

        schema: dict = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": org_name,
            "url": org_url,
        }
        if logo:
            schema["logo"] = logo
        return schema

    @classmethod
    def website(cls, tenant_id) -> dict:
        settings = SEOSettingsService.get_settings(tenant_id)
        site_name = settings.get("site_name") or settings.get("organization_name") or ""
        site_url = settings.get("canonical_base_url") or settings.get("organization_url") or ""

        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": site_name,
            "url": site_url,
            "inLanguage": settings.get("default_language") or "he",
        }

    @classmethod
    def breadcrumb(cls, tenant_id, items: list[dict], *, base_url: str | None = None) -> dict:
        settings = SEOSettingsService.get_settings(tenant_id)
        base = (base_url or settings.get("canonical_base_url") or "").rstrip("/")
        trail = BreadcrumbService.build(items)

        list_items = []
        for crumb in trail:
            url = crumb["url"]
            if base and url.startswith("/"):
                url = f"{base}{url}"
            list_items.append(
                {
                    "@type": "ListItem",
                    "position": crumb["position"],
                    "name": crumb["name"],
                    "item": url,
                }
            )

        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": list_items,
        }

    @classmethod
    def for_page(cls, tenant_id, *, breadcrumbs: list[dict] | None = None) -> list[dict]:
        schemas = [cls.organization(tenant_id), cls.website(tenant_id)]
        if breadcrumbs:
            schemas.append(cls.breadcrumb(tenant_id, breadcrumbs))
        return schemas

    # --- Architecture-ready stubs (not implemented) ---

    @staticmethod
    def webpage(**_kwargs) -> dict:
        raise NotImplementedError("WebPage schema is reserved for Phase 3+ content modules.")

    @staticmethod
    def faq(**_kwargs) -> dict:
        raise NotImplementedError("FAQ schema is reserved for Phase 3+ content modules.")

    @staticmethod
    def article(**_kwargs) -> dict:
        raise NotImplementedError("Article schema is reserved for Phase 3+ blog module.")

    @staticmethod
    def local_business(**_kwargs) -> dict:
        raise NotImplementedError("LocalBusiness schema is reserved for Phase 3+.")
