import pytest


@pytest.mark.django_db
def test_owner_can_read_settings(owner_client):
    response = owner_client.get("/api/v1/settings/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_owner_can_update_settings(owner_client):
    response = owner_client.patch(
        "/api/v1/settings/",
        {"company.name": "Acme Ltd"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json().get("company.name") == "Acme Ltd"


@pytest.mark.django_db
def test_read_only_cannot_update_settings(readonly_client):
    response = readonly_client.patch(
        "/api/v1/settings/",
        {"company.name": "Hack"},
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_public_features_default_enabled(api_client):
    response = api_client.get("/api/v1/settings/public/")
    assert response.status_code == 200
    assert response.json()["contact_widget_home"] is True


@pytest.mark.django_db
def test_owner_can_toggle_contact_widget(owner_client, owner_user):
    response = owner_client.patch(
        "/api/v1/settings/",
        {"features.contact_widget_home": "false"},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["features.contact_widget_home"] == "false"

    public = owner_client.get("/api/v1/settings/public/")
    assert public.status_code == 200
    assert public.json()["contact_widget_home"] is False
