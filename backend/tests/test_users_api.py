import pytest

from rbac.infrastructure.models import UserRole


@pytest.mark.django_db
def test_owner_can_list_users(owner_client):
    response = owner_client.get("/api/v1/users/")
    assert response.status_code == 200
    assert "results" in response.json()


@pytest.mark.django_db
def test_read_only_cannot_invite(readonly_client):
    response = readonly_client.post(
        "/api/v1/users/invite/",
        {
            "email": "invited@test.com",
            "first_name": "Inv",
            "last_name": "Ited",
            "role_slug": "read_only",
        },
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_owner_can_invite_edit_and_deactivate(owner_client, owner_user):
    invite = owner_client.post(
        "/api/v1/users/invite/",
        {
            "email": "invited@test.com",
            "first_name": "Inv",
            "last_name": "Ited",
            "role_slug": "read_only",
        },
        format="json",
    )
    assert invite.status_code == 201
    user_id = invite.json()["id"]

    patch = owner_client.patch(
        f"/api/v1/users/{user_id}/",
        {"first_name": "Updated", "is_active": False},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.json()["first_name"] == "Updated"
    assert patch.json()["is_active"] is False


@pytest.mark.django_db
def test_owner_can_assign_and_remove_role(owner_client, tenant):
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    User = get_user_model()
    user = User.objects.create_user(
        email="role@test.com",
        password="SecurePass123!",
        first_name="Role",
        last_name="Test",
        default_tenant=tenant,
    )
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])

    assign = owner_client.post(
        f"/api/v1/users/{user.id}/roles/",
        {"role_slug": "read_only"},
        format="json",
    )
    assert assign.status_code == 200

    role_id = UserRole.objects.get(user=user).role_id
    remove = owner_client.delete(f"/api/v1/users/{user.id}/roles/{role_id}/")
    assert remove.status_code == 204


@pytest.mark.django_db
def test_owner_can_soft_delete_user(owner_client, tenant):
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    User = get_user_model()
    user = User.objects.create_user(
        email="delete@test.com",
        password="SecurePass123!",
        first_name="Del",
        last_name="User",
        default_tenant=tenant,
    )
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])

    response = owner_client.delete(f"/api/v1/users/{user.id}/")
    assert response.status_code == 204
