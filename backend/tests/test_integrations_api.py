import pytest


@pytest.mark.django_db
def test_google_dashboard_lists_all_services(owner_client, tenant):
    response = owner_client.get("/api/v1/integrations/google/")
    assert response.status_code == 200
    data = response.json()
    assert "services" in data
    types = {s["service_type"] for s in data["services"]}
    assert types == {"search_console", "analytics", "trends"}
    for svc in data["services"]:
        assert svc["status"] in {
            "not_connected",
            "config_required",
            "waiting_authorization",
            "connected",
            "error",
        }


@pytest.mark.django_db
def test_connect_without_oauth_config_returns_setup_instructions(owner_client):
    response = owner_client.post(
        "/api/v1/integrations/google/connect/",
        {"service_type": "search_console"},
        format="json",
    )
    assert response.status_code == 503
    body = response.json()
    assert body.get("setup_required") is True
    assert len(body.get("setup_instructions", [])) > 0


@pytest.mark.django_db
def test_readonly_cannot_manage_integrations(readonly_client):
    response = readonly_client.post(
        "/api/v1/integrations/google/connect/",
        {"service_type": "search_console"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_sync_history_empty(owner_client):
    response = owner_client.get("/api/v1/integrations/google/sync/history/")
    assert response.status_code == 200
    assert response.json()["results"] == []
