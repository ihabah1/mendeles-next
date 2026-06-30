import pytest


@pytest.mark.django_db
def test_business_owner_has_expected_permissions(owner_client, owner_user):
    me = owner_client.get("/api/v1/auth/me/")
    assert me.status_code == 200
    perms = set(me.json()["permissions"])
    assert "users.view" in perms
    assert "users.invite" in perms
    assert "settings.manage" in perms


@pytest.mark.django_db
def test_read_only_user_limited_permissions(readonly_client):
    me = readonly_client.get("/api/v1/auth/me/")
    assert me.status_code == 200
    perms = set(me.json()["permissions"])
    assert "users.view" in perms
    assert "users.invite" not in perms
    assert "settings.manage" not in perms


@pytest.mark.django_db
def test_read_only_cannot_list_roles(readonly_client):
    response = readonly_client.get("/api/v1/roles/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_owner_can_list_roles_and_permissions(owner_client):
    roles = owner_client.get("/api/v1/roles/")
    assert roles.status_code == 200
    assert len(roles.json()["results"]) > 0

    perms = owner_client.get("/api/v1/permissions/")
    assert perms.status_code == 200
    assert len(perms.json()["results"]) > 0
