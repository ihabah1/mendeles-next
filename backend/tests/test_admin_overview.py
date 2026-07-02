import pytest


@pytest.mark.django_db
def test_super_admin_overview_has_no_landing_preview(api_client, seeded, tenant):
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    from rbac.infrastructure.models import Role, UserRole

    User = get_user_model()
    user = User.objects.create_user(
        email="admin@test.com",
        password="SecurePass123!",
        first_name="Super",
        last_name="Admin",
        default_tenant=tenant,
        is_superuser=True,
        is_staff=True,
    )
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])
    role = Role.objects.get(slug="super_admin", deleted_at__isnull=True)
    UserRole.objects.get_or_create(user=user, role=role, tenant=tenant)

    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": "SecurePass123!"},
        format="json",
    )
    token = login.json()["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    response = api_client.get("/api/v1/admin/overview/")
    assert response.status_code == 200
    data = response.json()
    assert "landing_preview" not in data
    assert data["system"]["users_total"] >= 1
    assert "logins_last_7d" in data["system"]
    assert "landing_pages_total" in data["system"]
    assert "recent_logins" in data
    assert "recent_landing_pages" in data
    assert "leads_total" in data["system"]
    assert "automation" in data
    assert data["automation"]["status"] == "not_implemented"
