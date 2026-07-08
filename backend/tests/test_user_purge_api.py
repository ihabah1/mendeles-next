import pytest


@pytest.mark.django_db
def test_blocked_registrations_api(api_client, seeded, super_admin_user):
    api_client.force_authenticate(user=super_admin_user)
    response = api_client.get("/api/v1/users/blocked-registrations/")
    assert response.status_code == 200
    assert "results" in response.json()


@pytest.mark.django_db
def test_purge_email_api(api_client, seeded, super_admin_user):
    reg = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "api-purge@test.com",
            "password": "SecurePass123!",
            "first_name": "Api",
            "last_name": "Purge",
            "tenant_name": "Api Purge Co",
        },
        format="json",
    )
    assert reg.status_code == 201

    api_client.force_authenticate(user=super_admin_user)
    purge = api_client.post(
        "/api/v1/users/purge/",
        {"emails": ["api-purge@test.com"], "purge_tenant": True},
        format="json",
    )
    assert purge.status_code == 200
    results = purge.json()["results"]
    assert results[0]["status"] == "purged"

    reg2 = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "api-purge@test.com",
            "password": "SecurePass123!",
            "first_name": "Api",
            "last_name": "Again",
            "tenant_name": "Api Purge Co 2",
        },
        format="json",
    )
    assert reg2.status_code == 201
