import pytest


@pytest.mark.django_db
def test_ai_seo_dashboard_returns_real_structure(owner_client):
    response = owner_client.get("/api/v1/ai-seo/dashboard/")
    assert response.status_code == 200
    data = response.json()
    assert "services" in data
    assert "kpis" in data
    assert "organic" in data
    assert data["kpis"]["new_leads"]["available"] is True
    assert data["kpis"]["lead_revenue"]["available"] is False
    service_ids = {s["id"] for s in data["services"]}
    assert "search_console" in service_ids
    assert "ai_provider" in service_ids


@pytest.mark.django_db
def test_ai_seo_refresh_requires_manage(owner_client, readonly_client):
    denied = readonly_client.post("/api/v1/ai-seo/refresh/", {"section": "trends"}, format="json")
    assert denied.status_code == 403
    ok = owner_client.post("/api/v1/ai-seo/refresh/", {"section": "trends"}, format="json")
    assert ok.status_code == 200
    assert "queued" in ok.json()


@pytest.mark.django_db
def test_ai_seo_studio_keywords(owner_client):
    response = owner_client.get("/api/v1/ai-seo/studio/keywords/")
    assert response.status_code == 200
    body = response.json()
    assert "results" in body
    assert "services" in body
