from seo.application.canonical_service import CanonicalService
from seo.application.settings_service import SEOSettingsService


class MetadataService:
    """Central metadata engine — single source for all page SEO tags."""

    @classmethod
    def build(cls, tenant_id, *, page: dict | None = None) -> dict:
        page = page or {}
        settings = SEOSettingsService.get_settings(tenant_id)

        title = page.get("title") or settings.get("default_title") or settings.get("site_name") or ""
        description = page.get("description") or settings.get("default_description") or ""
        keywords = page.get("keywords") or settings.get("default_keywords") or ""
        path = page.get("path") or "/"
        locale = page.get("locale") or settings.get("default_language") or "he"

        canonical = page.get("canonical") or CanonicalService.for_page(tenant_id, path)
        og_image = page.get("og_image") or settings.get("default_og_image") or ""
        twitter_image = page.get("twitter_image") or settings.get("default_twitter_image") or og_image

        site_name = settings.get("site_name") or settings.get("organization_name") or ""

        return {
            "title": title,
            "description": description,
            "keywords": keywords,
            "author": page.get("author") or settings.get("default_author") or "",
            "language": locale,
            "canonical": canonical,
            "robots": page.get("robots") or settings.get("robots_policy") or "index,follow",
            "open_graph": {
                "title": page.get("og_title") or title,
                "description": page.get("og_description") or description,
                "image": og_image,
                "url": canonical,
                "type": page.get("og_type") or "website",
                "site_name": site_name,
                "locale": locale,
            },
            "twitter": {
                "card": page.get("twitter_card") or "summary_large_image",
                "title": page.get("twitter_title") or title,
                "description": page.get("twitter_description") or description,
                "image": twitter_image,
            },
        }
