import pytest

from content.application.page_service import PageService
from content.application.publish_service import PublishService
from content.application.taxonomy_service import TaxonomyService
from content.application.template_service import TemplateService
from content.application.url_hierarchy_service import UrlHierarchyService
from content.application.version_service import VersionService
from content.domain.status import PageStatus
from content.infrastructure.models import Page
from seo.infrastructure.models import SEOSlug


@pytest.mark.django_db
def test_url_hierarchy_builds_nested_path(tenant):
    parent = PageService.create_page(tenant.id, None, {"title": "Blog", "slug": "blog"})
    child = PageService.create_page(
        tenant.id, None, {"title": "Post", "slug": "my-post", "parent_id": str(parent.id)}
    )
    assert parent.full_path == "/blog"
    assert child.full_path == "/blog/my-post"


@pytest.mark.django_db
def test_create_page_defaults_to_draft(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "Landing", "slug": "landing", "page_type": "landing_page"}
    )
    assert page.status == PageStatus.DRAFT
    assert page.slug == "landing"


@pytest.mark.django_db
def test_publish_creates_version_and_seo_slug(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "Promo", "slug": "promo", "page_type": "landing_page"}
    )
    published = PublishService.publish(tenant.id, page.id, owner_user, change_summary="Initial publish")
    assert published.status == PageStatus.PUBLISHED
    assert published.published_version == 1
    versions = VersionService.list_versions(published)
    assert len(versions) == 1
    assert SEOSlug.objects.filter(tenant_id=tenant.id, content_id=page.id, deleted_at__isnull=True).exists()


@pytest.mark.django_db
def test_taxonomy_and_terms(tenant):
    taxonomy = TaxonomyService.create_taxonomy(
        tenant.id, {"name": "Categories", "slug": "categories", "kind": "category"}
    )
    term = TaxonomyService.create_term(
        tenant.id, taxonomy.id, {"name": "Marketing", "slug": "marketing"}
    )
    assert term.full_path == "marketing"
    assert taxonomy.kind == "category"


@pytest.mark.django_db
def test_template_creation(tenant):
    template = TemplateService.create_template(
        tenant.id,
        {
            "name": "Landing default",
            "slug": "landing-default",
            "block_schema": [{"block_type": "hero", "config": {}}],
        },
    )
    assert template.block_schema[0]["block_type"] == "hero"


@pytest.mark.django_db
def test_path_uniqueness_per_locale(tenant, owner_user):
    PageService.create_page(tenant.id, owner_user, {"title": "A", "slug": "same", "locale": "he"})
    assert UrlHierarchyService.is_path_available(tenant.id, "/same", "he") is False
    assert UrlHierarchyService.is_path_available(tenant.id, "/same", "en") is True
