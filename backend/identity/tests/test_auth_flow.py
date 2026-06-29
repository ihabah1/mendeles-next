import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from rbac.management.commands.seed_rbac import Command as SeedRbac
from tenancy.infrastructure.models import Tenant


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def seeded(db):
    SeedRbac().handle()


@pytest.mark.django_db
def test_health(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.django_db
def test_register_and_verify_login_flow(api_client, seeded):
    reg = api_client.post(
        "/api/v1/auth/register/",
        {
            "email": "owner@test.com",
            "password": "SecurePass123!",
            "first_name": "דוד",
            "last_name": "כהן",
            "tenant_name": "עסק בדיקה",
        },
        format="json",
    )
    assert reg.status_code == 201

    from identity.infrastructure.models import EmailVerificationToken, User
    from identity.infrastructure.jwt import TokenHasher

    user = User.objects.get(email="owner@test.com")
    token = EmailVerificationToken.objects.filter(user=user).first()
    assert token is not None

    # Simulate verify with raw token from DB hash is not possible without raw - verify via service
    from identity.application.auth_service import AuthService
    from django.test import RequestFactory

    raw = "test-token-raw"
    token.token_hash = TokenHasher.hash_token(raw)
    token.save()

    factory = RequestFactory()
    req = factory.post("/")
    AuthService.verify_email(token=raw, request=req)

    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": "owner@test.com", "password": "SecurePass123!"},
        format="json",
    )
    assert login.status_code == 200
    assert "access" in login.json()
    assert "mendeles_refresh" in login.cookies
