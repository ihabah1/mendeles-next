import pytest


@pytest.mark.django_db
def test_users_hub_api(api_client, seeded, super_admin_user, owner_user):
    api_client.force_authenticate(user=super_admin_user)
    response = api_client.get("/api/v1/users/hub/")
    assert response.status_code == 200
    body = response.json()
    assert "stats" in body
    assert "daily_logins" in body
    assert "logins_by_email" in body
    assert body["scope"] == "platform"


@pytest.mark.django_db
def test_users_hub_email_daily(api_client, seeded, super_admin_user, owner_user):
    api_client.post(
        "/api/v1/auth/login/",
        {"email": owner_user.email, "password": "SecurePass123!"},
        format="json",
    )
    api_client.force_authenticate(user=super_admin_user)
    response = api_client.get(f"/api/v1/users/hub/?email={owner_user.email}")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == owner_user.email
    assert "daily" in body
