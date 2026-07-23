import pytest
from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone

from identity.application.google_login_service import GoogleLoginService, google_login_redirect_uri
from identity.infrastructure.models import OAuthLoginState


@pytest.mark.django_db
def test_google_login_status_endpoint(api_client, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_LOGIN_CLIENT_SECRET = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    settings.GOOGLE_LOGIN_REDIRECT_URI = ""
    settings.BACKEND_PUBLIC_URL = ""
    settings.FRONTEND_URL = "http://localhost:3000"

    response = api_client.get("/api/v1/auth/google/")
    assert response.status_code == 200
    assert response.json()["configured"] is False


@pytest.mark.django_db
def test_google_login_redirect_uri_prefers_frontend(settings):
    settings.FRONTEND_URL = "https://mendeles.com"
    settings.GOOGLE_LOGIN_REDIRECT_URI = (
        "https://eloquent-perfection-production-de3d.up.railway.app/api/v1/auth/google/callback/"
    )
    settings.BACKEND_PUBLIC_URL = "https://eloquent-perfection-production-de3d.up.railway.app"
    assert google_login_redirect_uri() == "https://mendeles.com/oauth/google/callback"


@pytest.mark.django_db
def test_google_login_start_requires_config(api_client, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_LOGIN_CLIENT_SECRET = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    settings.GOOGLE_LOGIN_REDIRECT_URI = ""
    settings.BACKEND_PUBLIC_URL = ""
    settings.FRONTEND_URL = ""

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
def test_google_login_complete_with_code_state(api_client, owner_user, settings):
    settings.JWT_COOKIE_SECURE = False
    settings.GOOGLE_LOGIN_CLIENT_ID = "client"
    settings.GOOGLE_LOGIN_CLIENT_SECRET = "secret"
    settings.FRONTEND_URL = "https://mendeles.com"

    OAuthLoginState.objects.create(
        state="state-code",
        code_verifier="verifier",
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    with patch.object(GoogleLoginService, "handle_callback", return_value="ticket-from-code") as mocked:
        OAuthLoginState.objects.create(
            state="state-ticket-holder",
            ticket="ticket-from-code",
            user=owner_user,
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        response = api_client.post(
            "/api/v1/auth/google/complete/",
            {"code": "auth-code", "state": "state-code"},
            format="json",
        )
        assert response.status_code == 200, response.content
        mocked.assert_called_once_with(state="state-code", code="auth-code")
        assert response.json()["user"]["email"] == owner_user.email


@pytest.mark.django_db
def test_google_resolve_links_existing_email(owner_user, settings):
    settings.GOOGLE_LOGIN_CLIENT_ID = "client"
    settings.GOOGLE_LOGIN_CLIENT_SECRET = "secret"
    settings.FRONTEND_URL = "https://mendeles.com"

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
    settings.FRONTEND_URL = "https://mendeles.com"

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
