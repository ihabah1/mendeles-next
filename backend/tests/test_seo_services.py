import pytest

from seo.application.metadata_service import MetadataService
from seo.application.robots_service import RobotsService
from seo.application.schema_service import SchemaService
from seo.application.settings_service import SEOSettingsService
from seo.application.sitemap_service import SitemapService
from seo.application.slug_service import SlugService
from seo.application.validation_service import SEOValidationService
from seo.domain.transliteration import slugify


@pytest.mark.django_db
def test_slugify_hebrew():
    assert slugify("שלום עולם") == "shlvm-vlm"
    assert slugify("Hello World") == "hello-world"


@pytest.mark.django_db
def test_slug_unique_generation(tenant):
    slug1 = SlugService.register_slug(tenant.id, "My Page", path="/my-page")
    slug2 = SlugService.generate_unique_slug(tenant.id, "My Page")
    assert slug1.slug == "my-page"
    assert slug2 == "my-page-2"


@pytest.mark.django_db
def test_metadata_service_builds_tags(tenant):
    SEOSettingsService.update_settings(
        tenant.id,
        {
            "site_name": "Acme",
            "default_title": "Acme Default",
            "default_description": "Desc",
            "canonical_base_url": "https://example.com",
        },
    )
    meta = MetadataService.build(tenant.id, page={"title": "Page", "path": "/about"})
    assert meta["title"] == "Page"
    assert meta["canonical"] == "https://example.com/about"
    assert meta["open_graph"]["title"] == "Page"
    assert meta["twitter"]["card"] == "summary_large_image"


@pytest.mark.django_db
def test_schema_organization_and_breadcrumb(tenant):
    SEOSettingsService.update_settings(
        tenant.id,
        {
            "organization_name": "Acme",
            "canonical_base_url": "https://example.com",
        },
    )
    org = SchemaService.organization(tenant.id)
    assert org["@type"] == "Organization"
    crumbs = SchemaService.breadcrumb(
        tenant.id,
        [{"name": "Home", "path": "/"}, {"name": "About", "path": "/about"}],
    )
    assert crumbs["@type"] == "BreadcrumbList"
    assert len(crumbs["itemListElement"]) == 2


@pytest.mark.django_db
def test_robots_production_vs_development(tenant):
    SEOSettingsService.update_settings(tenant.id, {"canonical_base_url": "https://example.com"})
    prod = RobotsService.generate(tenant.id, environment="production")
    dev = RobotsService.generate(tenant.id, environment="development")
    assert "Disallow: /dashboard/" in prod
    assert "Disallow: /" in dev


@pytest.mark.django_db
def test_sitemap_includes_static_pages(tenant):
    SEOSettingsService.update_settings(tenant.id, {"canonical_base_url": "https://example.com"})
    entries = SitemapService.collect_all(tenant.id)
    locs = [e["loc"] for e in entries]
    assert "https://example.com/" in locs
    assert any("/solutions/generate-leads" in loc for loc in locs)


@pytest.mark.django_db
def test_validation_detects_missing_fields(tenant):
    SEOSettingsService.update_settings(
        tenant.id,
        {
            "site_name": "Acme",
            "default_title": "Acme Title",
            "default_description": "Desc",
            "canonical_base_url": "https://example.com",
            "organization_name": "Acme",
        },
    )
    obj = SEOSettingsService.get_or_create(tenant.id)
    obj.site_name = ""
    obj.save()
    report = SEOValidationService.validate_global(tenant.id)
    assert report["valid"] is False
    assert any(i["code"] == "missing_site_name" for i in report["issues"])


@pytest.mark.django_db
def test_settings_auto_seed_when_never_configured(tenant):
    obj = SEOSettingsService.get_or_create(tenant.id)
    obj.site_name = ""
    obj.default_title = ""
    obj.default_description = ""
    obj.organization_name = ""
    obj.save()

    settings = SEOSettingsService.get_settings(tenant.id)
    assert settings["site_name"]
    assert settings["default_title"]
    assert settings["default_description"]
    assert settings["canonical_base_url"]
