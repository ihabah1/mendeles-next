import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from identity.infrastructure.jwt import TokenHasher
from identity.infrastructure.models import EmailVerificationToken
from rbac.infrastructure.models import Role, UserRole
from rbac.management.commands.seed_rbac import Command as SeedRbac
from tenancy.infrastructure.models import Tenant

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def seeded(db):
    SeedRbac().handle()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(name="Test Org", slug="test-org")


def verify_user(user):
    from django.utils import timezone

    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified_at"])


def assign_role(user, tenant, slug: str):
    role = Role.objects.get(slug=slug, deleted_at__isnull=True)
    UserRole.objects.get_or_create(user=user, role=role, tenant=tenant)


@pytest.fixture
def super_admin_user(seeded, tenant):
    user = User.objects.create_user(
        email="super@test.com",
        password="SecurePass123!",
        first_name="Super",
        last_name="Admin",
        default_tenant=tenant,
    )
    verify_user(user)
    assign_role(user, tenant, "super_admin")
    return user


@pytest.fixture
def owner_user(seeded, tenant):
    user = User.objects.create_user(
        email="owner@test.com",
        password="SecurePass123!",
        first_name="Owner",
        last_name="Test",
        default_tenant=tenant,
    )
    verify_user(user)
    assign_role(user, tenant, "business_owner")
    return user


@pytest.fixture
def client_user(seeded, tenant):
    user = User.objects.create_user(
        email="client@test.com",
        password="SecurePass123!",
        first_name="Client",
        last_name="User",
        default_tenant=tenant,
    )
    verify_user(user)
    assign_role(user, tenant, "client")
    from tenancy.application.credit_service import CreditService

    CreditService.grant_new_client_bonus(tenant.id)
    from automation.infrastructure.models import AutomationQueue

    AutomationQueue.objects.get_or_create(
        tenant=tenant,
        slug="default",
        defaults={"name": "Default Queue", "is_default": True},
    )
    return user


@pytest.fixture
def client_client(api_client, client_user):
    return auth_client(api_client, client_user)


@pytest.fixture
def read_only_user(seeded, tenant):
    user = User.objects.create_user(
        email="readonly@test.com",
        password="SecurePass123!",
        first_name="Read",
        last_name="Only",
        default_tenant=tenant,
    )
    verify_user(user)
    assign_role(user, tenant, "read_only")
    return user


def auth_client(api_client, user, password="SecurePass123!"):
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": user.email, "password": password},
        format="json",
    )
    assert login.status_code == 200, login.content
    token = login.json()["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.fixture
def owner_client(api_client, owner_user):
    return auth_client(api_client, owner_user)


@pytest.fixture
def readonly_client(api_client, read_only_user):
    return auth_client(api_client, read_only_user)


def register_payload(email="new@test.com", tenant_name="New Biz"):
    return {
        "email": email,
        "password": "SecurePass123!",
        "first_name": "New",
        "last_name": "User",
        "tenant_name": tenant_name,
    }
