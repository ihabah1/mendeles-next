import pytest


@pytest.mark.django_db
def test_whatsapp_public_status_returns_not_connected(api_client):
    response = api_client.get("/api/v1/whatsapp/status/")
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is False
    assert data["provider"] == "evolution"
    assert "not connected" in data["message"].lower()


@pytest.mark.django_db
def test_whatsapp_health_unconfigured(owner_client):
    response = owner_client.get("/api/v1/whatsapp/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is False
    assert data["reachable"] is False


@pytest.mark.django_db
def test_whatsapp_dashboard_status(owner_client):
    response = owner_client.get("/api/v1/whatsapp/status/")
    assert response.status_code == 200
    data = response.json()
    assert "connection_status" in data
    assert data["connection_status"] == "not_connected"
    assert data["provider"] == "evolution"


@pytest.mark.django_db
def test_whatsapp_connect_mock(owner_client):
    response = owner_client.post("/api/v1/whatsapp/connect/")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is False
    assert data["connection_status"] == "not_connected"


@pytest.mark.django_db
def test_whatsapp_disconnect_mock(owner_client):
    response = owner_client.post("/api/v1/whatsapp/disconnect/")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is False


@pytest.mark.django_db
def test_whatsapp_qr_unconfigured(owner_client):
    response = owner_client.get("/api/v1/whatsapp/qr/")
    assert response.status_code == 200
    data = response.json()
    assert data["qr_status"] == "unavailable"
    assert data["qr_code"] is None


@pytest.mark.django_db
def test_whatsapp_refresh(owner_client):
    response = owner_client.post("/api/v1/whatsapp/refresh/")
    assert response.status_code == 200
    assert "connection_status" in response.json()


@pytest.mark.django_db
def test_readonly_cannot_connect_whatsapp(readonly_client):
    response = readonly_client.post("/api/v1/whatsapp/connect/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_anonymous_cannot_access_health(api_client):
    response = api_client.get("/api/v1/whatsapp/health/")
    assert response.status_code in (401, 403)
