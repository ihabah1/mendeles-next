import pytest

from content.application.block_service import BlockService
from content.application.page_service import PageService
from content.application.publish_service import PublishService
from content.domain.status import PageStatus


@pytest.mark.django_db
def test_list_pages_empty(owner_client):
    response = owner_client.get("/api/v1/content/pages/")
    assert response.status_code == 200
    assert response.json()["results"] == []


@pytest.mark.django_db
def test_create_and_get_page(owner_client):
    create = owner_client.post(
        "/api/v1/content/pages/",
        {"title": "Test Landing", "slug": "test-landing", "page_type": "landing_page"},
        format="json",
    )
    assert create.status_code == 201
    page_id = create.json()["id"]

    detail = owner_client.get(f"/api/v1/content/pages/{page_id}/")
    assert detail.status_code == 200
    assert detail.json()["title"] == "Test Landing"
    assert detail.json()["status"] == PageStatus.DRAFT


@pytest.mark.django_db
def test_publish_page(owner_client):
    create = owner_client.post(
        "/api/v1/content/pages/",
        {"title": "Publish Me", "slug": "publish-me"},
        format="json",
    )
    page_id = create.json()["id"]
    response = owner_client.post(
        f"/api/v1/content/pages/{page_id}/publish/",
        {"status": "published", "change_summary": "Go live"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["status"] == PageStatus.PUBLISHED
    assert response.json()["published_version"] == 1


@pytest.mark.django_db
def test_page_versions(owner_client):
    create = owner_client.post(
        "/api/v1/content/pages/",
        {"title": "Versioned", "slug": "versioned"},
        format="json",
    )
    page_id = create.json()["id"]
    owner_client.post(f"/api/v1/content/pages/{page_id}/publish/", {"status": "published"}, format="json")

    versions = owner_client.get(f"/api/v1/content/pages/{page_id}/versions/")
    assert versions.status_code == 200
    assert len(versions.json()["results"]) == 1


@pytest.mark.django_db
def test_create_block(owner_client):
    create = owner_client.post(
        "/api/v1/content/pages/",
        {"title": "With Blocks", "slug": "with-blocks"},
        format="json",
    )
    page_id = create.json()["id"]
    block = owner_client.post(
        f"/api/v1/content/pages/{page_id}/blocks/",
        {"block_type": "hero", "config": {"headline": "Hello"}},
        format="json",
    )
    assert block.status_code == 201
    assert block.json()["block_type"] == "hero"


@pytest.mark.django_db
def test_taxonomies_and_templates(owner_client):
    tax = owner_client.post(
        "/api/v1/content/taxonomies/",
        {"name": "Tags", "slug": "tags", "kind": "tag", "allow_multiple": True},
        format="json",
    )
    assert tax.status_code == 201
    taxonomy_id = tax.json()["id"]

    term = owner_client.post(
        f"/api/v1/content/taxonomies/{taxonomy_id}/terms/",
        {"name": "SEO", "slug": "seo"},
        format="json",
    )
    assert term.status_code == 201

    template = owner_client.post(
        "/api/v1/content/templates/",
        {"name": "Basic", "slug": "basic", "block_schema": []},
        format="json",
    )
    assert template.status_code == 201


@pytest.mark.django_db
def test_read_only_cannot_create_page(readonly_client):
    response = readonly_client.post(
        "/api/v1/content/pages/",
        {"title": "Nope", "slug": "nope"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_duplicate_page_api(owner_client):
    create = owner_client.post(
        "/api/v1/content/pages/",
        {"title": "Source", "slug": "source", "page_type": "landing_page"},
        format="json",
    )
    page_id = create.json()["id"]
    dup = owner_client.post(f"/api/v1/content/pages/{page_id}/duplicate/", format="json")
    assert dup.status_code == 201
    assert dup.json()["title"] == "Source (copy)"
    assert dup.json()["status"] == PageStatus.DRAFT


@pytest.mark.django_db
def test_media_api(owner_client):
    response = owner_client.post(
        "/api/v1/content/media/",
        {
            "media_type": "document",
            "title": "Brochure",
            "url": "https://cdn.example.com/brochure.pdf",
            "mime_type": "application/pdf",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["media_type"] == "document"


@pytest.mark.django_db
def test_public_page_resolve_serves_only_published_pages(api_client, tenant, owner_user):
    page = PageService.create_page(
        tenant.id,
        owner_user,
        {"title": "Live Promo", "slug": "live-promo", "page_type": "landing_page"},
    )
    BlockService.create_block(page, {"block_type": "hero", "config": {"headline": "Live headline"}})

    draft = api_client.get("/api/v1/content/public/pages/resolve/?path=/pages/live-promo&locale=he")
    assert draft.status_code == 404

    PublishService.publish(tenant.id, page.id, owner_user)
    live = api_client.get("/api/v1/content/public/pages/resolve/?path=/pages/live-promo&locale=he")
    assert live.status_code == 200
    assert live.json()["title"] == "Live Promo"
    assert live.json()["blocks"][0]["config"]["headline"] == "Live headline"


@pytest.mark.django_db
def test_public_page_list_filters_published_blog_pages(api_client, tenant, owner_user):
    blog = PageService.create_page(
        tenant.id,
        owner_user,
        {"title": "AI Growth", "slug": "ai-growth", "page_type": "blog", "meta_description": "Growth guide"},
    )
    BlockService.create_block(blog, {"block_type": "rich_text", "config": {"html": "<p>Body</p>"}})
    PublishService.publish(tenant.id, blog.id, owner_user)
    draft = PageService.create_page(
        tenant.id,
        owner_user,
        {"title": "Draft Blog", "slug": "draft-blog", "page_type": "blog"},
    )

    response = api_client.get("/api/v1/content/public/pages/?page_type=blog&locale=he&q=growth")

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["results"]]
    assert "AI Growth" in titles
    assert draft.title not in titles
