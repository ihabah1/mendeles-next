import pytest
from django.contrib.auth import get_user_model

from identity.application.purge_service import UserPurgeService


@pytest.mark.django_db
def test_purge_user_frees_email_for_registration(api_client, seeded):
    User = get_user_model()
    email = "purge-me@test.com"
    reg = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Purge",
            "last_name": "Me",
            "tenant_name": "Purge Co",
        },
        format="json",
    )
    assert reg.status_code == 201

    result = UserPurgeService.purge_by_email(email=email, purge_tenant=True)
    assert result["status"] == "purged"
    assert not User.objects.filter(email=email).exists()

    reg2 = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Purge",
            "last_name": "Again",
            "tenant_name": "Purge Co 2",
        },
        format="json",
    )
    assert reg2.status_code == 201, reg2.content


@pytest.mark.django_db
def test_soft_delete_frees_email(seeded):
    User = get_user_model()
    user = User.objects.create_user(
        email="soft-free@test.com",
        password="SecurePass123!",
        first_name="Soft",
        last_name="Delete",
    )
    user.soft_delete()
    user.refresh_from_db()
    assert user.email != "soft-free@test.com"
    assert user.deleted_at is not None
    assert not User.objects.filter(email="soft-free@test.com", deleted_at__isnull=True).exists()
