import pytest

from tenancy.application.credit_service import NEW_CLIENT_CREDITS, PRODUCT_CREDIT_COST, CreditService


@pytest.mark.django_db
def test_register_grants_client_role_and_credits(api_client, seeded):
    from django.contrib.auth import get_user_model

    from rbac.infrastructure.models import UserRole

    reg = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "fresh-client@test.com",
            "password": "SecurePass123!",
            "first_name": "Fresh",
            "last_name": "Client",
            "tenant_name": "Fresh Co",
        },
        format="json",
    )
    assert reg.status_code == 201

    user = get_user_model().objects.get(email="fresh-client@test.com")
    roles = list(UserRole.objects.filter(user=user).values_list("role__slug", flat=True))
    assert "client" in roles
    assert CreditService.get_balance(user.default_tenant_id) == NEW_CLIENT_CREDITS


@pytest.mark.django_db
def test_client_submit_request_deducts_credits(client_client, client_user, tenant):
    before = CreditService.get_balance(tenant.id)

    res = client_client.post(
        "/api/v1/client/requests/",
        {
            "product_type": "landing_page",
            "title": "My landing page",
            "brief": "Insurance services",
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.json()["product_type"] == "landing_page"
    assert CreditService.get_balance(tenant.id) == before - PRODUCT_CREDIT_COST


@pytest.mark.django_db
def test_client_dashboard(client_client):
    res = client_client.get("/api/v1/client/dashboard/")
    assert res.status_code == 200
    body = res.json()
    assert body["credits_balance"] == NEW_CLIENT_CREDITS
    assert body["credit_cost_per_product"] == PRODUCT_CREDIT_COST


@pytest.mark.django_db
def test_login_converts_self_registered_owner_to_client(api_client, seeded, tenant):
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    from audit.application.audit_service import AuditService
    from rbac.infrastructure.models import Role, UserRole

    User = get_user_model()
    user = User.objects.create_user(
        email="legacy-owner@test.com",
        password="SecurePass123!",
        first_name="Legacy",
        last_name="Owner",
        default_tenant=tenant,
        email_verified_at=timezone.now(),
    )
    owner_role = Role.objects.get(slug="business_owner", tenant__isnull=True, is_system=True)
    UserRole.objects.create(user=user, role=owner_role, tenant=tenant)
    AuditService.log(action="user.registered", user=user, tenant_id=tenant.id, resource_type="user", resource_id=user.id)

    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": "legacy-owner@test.com", "password": "SecurePass123!"},
        format="json",
    )
    assert login.status_code == 200
    body = login.json()["user"]
    assert "client" in body["roles"]
    assert body.get("credits_balance", 0) == NEW_CLIENT_CREDITS


@pytest.mark.django_db
def test_update_me_profile(client_client):
    res = client_client.patch(
        "/api/v1/auth/me/",
        {"first_name": "Updated", "phone": "0501234567"},
        format="json",
    )
    assert res.status_code == 200
    assert res.json()["first_name"] == "Updated"
    assert res.json()["phone"] == "0501234567"
