import pytest
from datetime import timedelta

from django.utils import timezone

from identity.application.google_login_service import GoogleLoginService
from identity.infrastructure.models import OAuthLoginState


@pytest.mark.django_db
def test_google_login_status_endpoint(api_client, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_LOGIN_CLIENT_SECRET = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    settings.GOOGLE_LOGIN_REDIRECT_URI = ""
    settings.BACKEND_PUBLIC_URL = ""

    response = api_client.get("/api/v1/auth/google/")
    assert response.status_code == 200
    assert response.json()["configured"] is False


@pytest.mark.django_db
def test_google_login_start_requires_config(api_client, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_LOGIN_CLIENT_SECRET = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    settings.GOOGLE_LOGIN_REDIRECT_URI = ""
    settings.BACKEND_PUBLIC_URL = ""

    response = api_client.post("/api/v1/auth/google/")
    assert response.status_code == 503


@pytest.mark.django_db
def test_google_login_complete_issues_tokens(api_client, owner_user, settings):
    settings.JWT_COOKIE_SECURE = False
    record = OAuthLoginState.objects.create(
        state="state-test",
        ticket="ticket-test",
        user=owner_user,
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    response = api_client.post("/api/v1/auth/google/complete/", {"ticket": "ticket-test"}, format="json")
    assert response.status_code == 200, response.content
    body = response.json()
    assert "access" in body
    assert body["user"]["email"] == owner_user.email
    assert "mendeles_refresh" in response.cookies

    record.refresh_from_db()
    assert record.used_at is not None

    reused = api_client.post("/api/v1/auth/google/complete/", {"ticket": "ticket-test"}, format="json")
    assert reused.status_code == 401


@pytest.mark.django_db
def test_google_resolve_links_existing_email(owner_user, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = "client"
    settings.GOOGLE_LOGIN_CLIENT_SECRET = "secret"
    settings.GOOGLE_LOGIN_REDIRECT_URI = "http://backend.test/api/v1/auth/google/callback/"

    user = GoogleLoginService._resolve_user(
        google_sub="google-sub-1",
        email=owner_user.email,
        first_name="Owner",
        last_name="Test",
    )
    assert user.id == owner_user.id
    user.refresh_from_db()
    assert user.google_sub == "google-sub-1"


@pytest.mark.django_db
def test_google_resolve_creates_new_user(db, settings, monkeypatch):
    settings.GOOGLE_LOGIN_CLIENT_ID = "client"
    settings.GOOGLE_LOGIN_CLIENT_SECRET = "secret"
    settings.GOOGLE_LOGIN_REDIRECT_URI = "http://backend.test/api/v1/auth/google/callback/"

    from rbac.management.commands.seed_rbac import Command as SeedRbac

    SeedRbac().handle()

    user = GoogleLoginService._resolve_user(
        google_sub="google-sub-new",
        email="new.google@example.com",
        first_name="New",
        last_name="User",
    )
    assert user.email == "new.google@example.com"
    assert user.google_sub == "google-sub-new"
    assert user.is_email_verified
    assert not user.has_usable_password()
    assert user.default_tenant_id is not None
