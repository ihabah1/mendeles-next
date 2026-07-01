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
    parent = PageService.create_page(tenant.id, None, {"title": "Blog", "slug": "blog", "page_type": "blog"})
    child = PageService.create_page(
        tenant.id,
        None,
        {"title": "Post", "slug": "my-post", "page_type": "blog", "parent_id": str(parent.id)},
    )
    assert parent.full_path == "/blog/blog"
    assert child.full_path == "/blog/blog/my-post"


@pytest.mark.django_db
def test_landing_page_gets_pages_prefix(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "Landing", "slug": "promo", "page_type": "landing_page"}
    )
    assert page.full_path == "/pages/promo"


@pytest.mark.django_db
def test_static_page_at_root(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "About", "slug": "about", "page_type": "static"}
    )
    assert page.full_path == "/about"


@pytest.mark.django_db
def test_blog_root_path(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "First Post", "slug": "first-post", "page_type": "blog"}
    )
    assert page.full_path == "/blog/first-post"


@pytest.mark.django_db
def test_create_page_defaults_to_draft(tenant, owner_user):
    page = PageService.create_page(
        tenant.id, owner_user, {"title": "Landing", "slug": "landing", "page_type": "landing_page"}
    )
    assert page.status == PageStatus.DRAFT
    assert page.slug == "landing"
    assert page.author_id == owner_user.id


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
    PageService.create_page(
        tenant.id, owner_user, {"title": "A", "slug": "same", "locale": "he", "page_type": "static"}
    )
    assert UrlHierarchyService.is_path_available(tenant.id, "/same", "he") is False
    assert UrlHierarchyService.is_path_available(tenant.id, "/same", "en") is True


@pytest.mark.django_db
def test_duplicate_page_copies_blocks(tenant, owner_user):
    from content.application.duplicate_service import DuplicateService

    source = PageService.create_page(
        tenant.id, owner_user, {"title": "Original", "slug": "original", "page_type": "landing_page"}
    )
    from content.application.block_service import BlockService

    BlockService.create_block(source, {"block_type": "hero", "config": {"title": "Hi"}})
    dup = DuplicateService.duplicate_page(tenant.id, source.id, owner_user)
    assert dup.status == PageStatus.DRAFT
    assert dup.title == "Original (copy)"
    assert dup.blocks.filter(deleted_at__isnull=True).count() == 1


@pytest.mark.django_db
def test_media_asset_creation(tenant, owner_user):
    from content.application.media_service import MediaService

    asset = MediaService.create_media(
        tenant.id,
        owner_user,
        {"media_type": "image", "title": "Hero", "url": "https://cdn.example.com/hero.jpg"},
    )
    assert asset.media_type == "image"


@pytest.mark.django_db
def test_scheduled_publish_job(tenant, owner_user):
    from datetime import timedelta

    from django.utils import timezone

    from content.application.scheduled_publish_service import ScheduledPublishService

    page = PageService.create_page(
        tenant.id, owner_user, {"title": "Future", "slug": "future", "page_type": "landing_page"}
    )
    page.status = PageStatus.SCHEDULED
    page.scheduled_at = timezone.now() - timedelta(minutes=1)
    page.updated_by = owner_user
    page.save()

    published = ScheduledPublishService.process_due_pages()
    assert str(page.id) in published
    page.refresh_from_db()
    assert page.status == PageStatus.PUBLISHED
