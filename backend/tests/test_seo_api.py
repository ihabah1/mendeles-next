import pytest

from seo.application.settings_service import SEOSettingsService


@pytest.mark.django_db
def test_owner_can_read_seo_settings(owner_client, tenant):
    SEOSettingsService.get_or_create(tenant.id)
    response = owner_client.get("/api/v1/seo/settings/")
    assert response.status_code == 200
    assert "site_name" in response.json()


@pytest.mark.django_db
def test_owner_can_update_seo_settings(owner_client, tenant):
    response = owner_client.patch(
        "/api/v1/seo/settings/",
        {
            "site_name": "Mendeles",
            "default_title": "Mendeles SEO",
            "canonical_base_url": "https://mendeles.co.il",
        },
        format="json",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["site_name"] == "Mendeles"
    assert data["canonical_base_url"] == "https://mendeles.co.il"


@pytest.mark.django_db
def test_read_only_cannot_update_seo(readonly_client):
    response = readonly_client.patch(
        "/api/v1/seo/settings/",
        {"site_name": "Hack"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_seo_status_endpoint(owner_client, tenant):
    SEOSettingsService.update_settings(
        tenant.id,
        {
            "site_name": "Mendeles",
            "canonical_base_url": "https://mendeles.co.il",
            "default_description": "Test",
        },
    )
    response = owner_client.get("/api/v1/seo/status/")
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert "global" in data


@pytest.mark.django_db
def test_seo_validate_endpoint(owner_client):
    response = owner_client.post(
        "/api/v1/seo/validate/",
        {"page": {"title": "Test", "description": "Desc", "path": "/"}},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["valid"] is True


@pytest.mark.django_db
def test_seo_sitemap_public(api_client, tenant):
    SEOSettingsService.update_settings(tenant.id, {"canonical_base_url": "https://example.com"})
    response = api_client.get("/api/v1/seo/sitemap/")
    assert response.status_code == 200
    assert len(response.json()["entries"]) > 0


@pytest.mark.django_db
def test_seo_robots_public(api_client, tenant):
    SEOSettingsService.update_settings(tenant.id, {"canonical_base_url": "https://example.com"})
    response = api_client.get("/api/v1/seo/robots/")
    assert response.status_code == 200
    assert "User-agent" in response.json()["content"]


@pytest.mark.django_db
def test_seo_slug_generate(owner_client):
    response = owner_client.post(
        "/api/v1/seo/slugs/generate/",
        {"text": "דף נחיתה", "locale": "he"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["slug"]


@pytest.mark.django_db
def test_seo_redirect_infrastructure(owner_client):
    response = owner_client.post(
        "/api/v1/seo/redirects/",
        {"from_path": "/old", "to_path": "/new", "status_code": 301},
        format="json",
    )
    assert response.status_code == 201
    listing = owner_client.get("/api/v1/seo/redirects/")
    assert listing.status_code == 200
    assert any(r["from_path"] == "/old" for r in listing.json()["results"])
