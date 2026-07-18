"""Google Sign-In (OpenID) — separate from integrations OAuth."""

from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from google_auth_oauthlib.flow import Flow

from audit.application.audit_service import AuditService
from core.exceptions.base import UnauthorizedError, ValidationError
from identity.application.auth_service import AuthService, _client_meta, _ensure_system_roles_seeded
from identity.infrastructure.jwt import JWTService
from identity.infrastructure.models import OAuthLoginState
from rbac.infrastructure.models import Role, UserRole
from tenancy.application.onboarding_service import OnboardingService
from tenancy.domain.services import slugify_tenant_name
from tenancy.infrastructure.models import Tenant

User = get_user_model()

GOOGLE_LOGIN_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

STATE_TTL = timedelta(minutes=15)
TICKET_TTL = timedelta(minutes=5)


class GoogleLoginError(Exception):
    pass


def google_login_client_id() -> str:
    return (
        getattr(settings, "GOOGLE_LOGIN_CLIENT_ID", "")
        or getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        or ""
    ).strip()


def google_login_client_secret() -> str:
    return (
        getattr(settings, "GOOGLE_LOGIN_CLIENT_SECRET", "")
        or getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
        or ""
    ).strip()


def google_login_redirect_uri() -> str:
    explicit = getattr(settings, "GOOGLE_LOGIN_REDIRECT_URI", "").strip().rstrip("/")
    if explicit:
        return explicit
    backend = getattr(settings, "BACKEND_PUBLIC_URL", "").rstrip("/")
    if backend:
        return f"{backend}/api/v1/auth/google/callback/"
    return ""


def google_login_configured() -> bool:
    return bool(google_login_client_id() and google_login_client_secret() and google_login_redirect_uri())


def frontend_google_callback_url(*, error: str = "", ticket: str = "") -> str:
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    path = f"{base}/oauth/google/callback"
    params: dict[str, str] = {}
    if error:
        params["error"] = error[:200]
    if ticket:
        params["ticket"] = ticket
    if not params:
        return path
    return f"{path}?{urlencode(params)}"


class GoogleLoginService:
    @staticmethod
    def _flow() -> Flow:
        if not google_login_configured():
            raise GoogleLoginError("Google Sign-In is not configured on the server.")
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": google_login_client_id(),
                    "client_secret": google_login_client_secret(),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=GOOGLE_LOGIN_SCOPES,
        )
        flow.redirect_uri = google_login_redirect_uri()
        return flow

    @classmethod
    def begin(cls) -> dict[str, Any]:
        if not google_login_configured():
            raise GoogleLoginError("Google Sign-In is not configured on the server.")
        state = secrets.token_urlsafe(24)
        OAuthLoginState.objects.create(
            state=state,
            expires_at=timezone.now() + STATE_TTL,
        )
        flow = cls._flow()
        auth_url, _ = flow.authorization_url(
            access_type="online",
            include_granted_scopes="true",
            prompt="select_account",
            state=state,
        )
        return {
            "auth_url": auth_url,
            "configured": True,
        }

    @classmethod
    def handle_callback(cls, *, state: str, code: str) -> str:
        """Exchange code, resolve user, return one-time ticket."""
        record = OAuthLoginState.objects.filter(state=state, used_at__isnull=True).first()
        if not record or record.expires_at < timezone.now():
            raise GoogleLoginError("Invalid or expired Google sign-in state.")

        flow = cls._flow()
        try:
            flow.fetch_token(code=code)
        except Exception as exc:  # noqa: BLE001
            raise GoogleLoginError(f"Google token exchange failed: {exc}") from exc

        credentials = flow.credentials
        id_info = cls._verify_id_token(credentials.id_token)
        email = (id_info.get("email") or "").strip().lower()
        sub = (id_info.get("sub") or "").strip()
        if not email or not sub:
            raise GoogleLoginError("Google did not return a verified email identity.")
        if not id_info.get("email_verified", True):
            raise GoogleLoginError("Google email address is not verified.")

        first_name = (id_info.get("given_name") or "").strip()
        last_name = (id_info.get("family_name") or "").strip()
        if not first_name and id_info.get("name"):
            parts = str(id_info["name"]).strip().split(None, 1)
            first_name = parts[0] if parts else ""
            last_name = parts[1] if len(parts) > 1 else last_name

        user = cls._resolve_user(
            google_sub=sub,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        ticket = secrets.token_urlsafe(32)
        record.user = user
        record.ticket = ticket
        record.expires_at = timezone.now() + TICKET_TTL
        record.save(update_fields=["user", "ticket", "expires_at"])
        return ticket

    @staticmethod
    def _verify_id_token(id_token: str | None) -> dict[str, Any]:
        if not id_token:
            raise GoogleLoginError("Google did not return an ID token.")
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token

            return google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                google_login_client_id(),
            )
        except Exception as exc:  # noqa: BLE001
            raise GoogleLoginError(f"Invalid Google ID token: {exc}") from exc

    @classmethod
    @transaction.atomic
    def _resolve_user(
        cls,
        *,
        google_sub: str,
        email: str,
        first_name: str,
        last_name: str,
    ) -> Any:
        by_sub = User.objects.filter(google_sub=google_sub, deleted_at__isnull=True).first()
        if by_sub:
            if not by_sub.is_active:
                raise GoogleLoginError("This account is inactive.")
            if not by_sub.is_email_verified:
                by_sub.email_verified_at = timezone.now()
                by_sub.save(update_fields=["email_verified_at", "updated_at"])
            return by_sub

        by_email = User.objects.filter(email=email, deleted_at__isnull=True).first()
        if by_email:
            if by_email.google_sub and by_email.google_sub != google_sub:
                raise GoogleLoginError("This email is already linked to another Google account.")
            if not by_email.is_active:
                raise GoogleLoginError("This account is inactive.")
            by_email.google_sub = google_sub
            updates = ["google_sub", "updated_at"]
            if not by_email.is_email_verified:
                by_email.email_verified_at = timezone.now()
                updates.append("email_verified_at")
            if first_name and not by_email.first_name:
                by_email.first_name = first_name[:100]
                updates.append("first_name")
            if last_name and not by_email.last_name:
                by_email.last_name = last_name[:100]
                updates.append("last_name")
            by_email.save(update_fields=updates)
            return by_email

        return cls._register_google_user(
            email=email,
            google_sub=google_sub,
            first_name=first_name,
            last_name=last_name,
        )

    @classmethod
    def _register_google_user(
        cls,
        *,
        email: str,
        google_sub: str,
        first_name: str,
        last_name: str,
    ) -> Any:
        import uuid

        local = email.split("@", 1)[0] or "business"
        tenant_name = first_name or local
        base_slug = slugify_tenant_name(tenant_name)
        slug = base_slug
        if not slug or Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug or 'tenant'}-{uuid.uuid4().hex[:8]}"

        tenant = Tenant.objects.create(name=(tenant_name or local)[:255], slug=slug)
        user = User.objects.create_user(
            email=email,
            password=None,
            first_name=(first_name or local)[:100],
            last_name=(last_name or "")[:100],
            default_tenant=tenant,
            google_sub=google_sub,
            email_verified_at=timezone.now(),
        )
        user.set_unusable_password()
        user.save(update_fields=["password", "updated_at"])

        _ensure_system_roles_seeded()
        client_role = Role.objects.get(slug="client", tenant__isnull=True, is_system=True)
        UserRole.objects.create(user=user, role=client_role, tenant=tenant)

        from types import SimpleNamespace

        OnboardingService.setup_new_client(
            tenant=tenant,
            user=user,
            request=SimpleNamespace(META={}, user=user),
        )
        AuditService.log(
            action="user.registered_google",
            user=user,
            tenant_id=tenant.id,
            resource_type="user",
            resource_id=user.id,
            metadata={"provider": "google"},
        )
        return user

    @classmethod
    def complete(cls, *, ticket: str, request) -> dict:
        record = (
            OAuthLoginState.objects.select_related("user")
            .filter(ticket=ticket, used_at__isnull=True)
            .first()
        )
        if not record or not record.user_id or record.expires_at < timezone.now():
            raise UnauthorizedError("Google sign-in ticket is invalid or expired.")

        user = record.user
        if not user.is_active or user.deleted_at is not None:
            raise UnauthorizedError("This account is inactive.")

        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])

        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at", "updated_at"])

        from identity.application.client_portal_service import ensure_client_portal_user

        ensure_client_portal_user(user, request=request)
        ip, ua = _client_meta(request)
        tenant_id = user.default_tenant_id
        access = JWTService.create_access_token(user, tenant_id)
        refresh, _ = JWTService.create_refresh_token(user, ip_address=ip, user_agent=ua)

        AuditService.log(
            action="auth.login_google",
            user=user,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
        )
        return {
            "access": access,
            "refresh": refresh,
            "expires_in": int(settings.JWT_ACCESS_TTL.total_seconds()),
            "user": AuthService.serialize_user(user, tenant_id),
        }
