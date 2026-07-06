import pytest
from django.contrib.auth import get_user_model

from identity.infrastructure.jwt import TokenHasher
from identity.infrastructure.models import EmailVerificationToken


def _register_payload(email="new@test.com", tenant_name="New Biz"):
    return {
        "email": email,
        "password": "SecurePass123!",
        "first_name": "New",
        "last_name": "User",
        "tenant_name": tenant_name,
    }


@pytest.mark.django_db
def test_health(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.django_db
def test_register_and_verify_login_flow(api_client, seeded):
    reg = api_client.post("/api/v1/auth/register/", _register_payload(), format="json")
    assert reg.status_code == 201

    User = get_user_model()
    user = User.objects.get(email="new@test.com")
    token = EmailVerificationToken.objects.filter(user=user).first()
    assert token is not None

    raw = "test-token-raw"
    token.token_hash = TokenHasher.hash_token(raw)
    token.save()

    verify = api_client.post("/api/v1/auth/verify-email/", {"token": raw}, format="json")
    assert verify.status_code == 200

    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": "new@test.com", "password": "SecurePass123!"},
        format="json",
    )
    assert login.status_code == 200
    assert "access" in login.json()
    assert "mendeles_refresh" in login.cookies


@pytest.mark.django_db
def test_refresh_and_logout(api_client, seeded, owner_user):
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": owner_user.email, "password": "SecurePass123!"},
        format="json",
    )
    refresh_cookie = login.cookies["mendeles_refresh"].value

    refresh = api_client.post(
        "/api/v1/auth/refresh/",
        {},
        format="json",
        HTTP_COOKIE=f"mendeles_refresh={refresh_cookie}",
    )
    assert refresh.status_code == 200
    assert "access" in refresh.json()

    logout = api_client.post(
        "/api/v1/auth/logout/",
        {},
        format="json",
        HTTP_COOKIE=f"mendeles_refresh={refresh.cookies.get('mendeles_refresh', refresh_cookie)}",
        HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}",
    )
    assert logout.status_code == 204


@pytest.mark.django_db
def test_forgot_password(api_client, seeded, owner_user):
    response = api_client.post(
        "/api/v1/auth/forgot-password/",
        {"email": owner_user.email},
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_login_rate_limit(api_client, seeded, owner_user, settings):
    settings.RATELIMIT_ENABLE = True
    for _ in range(21):
        api_client.post(
            "/api/v1/auth/login/",
            {"email": owner_user.email, "password": "wrong-password"},
            format="json",
        )
    response = api_client.post(
        "/api/v1/auth/login/",
        {"email": owner_user.email, "password": "wrong-password"},
        format="json",
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"


@pytest.mark.django_db
def test_unverified_user_cannot_login(api_client, seeded):
    api_client.post("/api/v1/auth/register/", _register_payload("unverified@test.com"), format="json")
    login = api_client.post(
        "/api/v1/auth/login/",
        {"email": "unverified@test.com", "password": "SecurePass123!"},
        format="json",
    )
    assert login.status_code in (401, 403)


@pytest.mark.django_db
def test_register_without_rbac_seed_auto_seeds(api_client):
    reg = api_client.post("/api/v1/auth/register/", _register_payload("fresh@test.com"), format="json")
    assert reg.status_code == 201, reg.content
    body = reg.json()
    assert body["user_id"]
    assert body.get("verification_email_sent") is True


@pytest.mark.django_db
def test_register_survives_email_failure(api_client, seeded, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("smtp unavailable")

    monkeypatch.setattr("identity.application.auth_service.EmailService.send_verification_email", boom)
    reg = api_client.post(
        "/api/v1/auth/register/",
        _register_payload("mailfail@test.com"),
        format="json",
    )
    assert reg.status_code == 201, reg.content
    body = reg.json()
    assert body["verification_email_sent"] is False
    assert "user_id" in body

    User = get_user_model()
    assert User.objects.filter(email="mailfail@test.com").exists()
