"""Google OAuth 2.0 — no credentials in code; fails clearly when not configured."""

from __future__ import annotations

import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

from core.crypto import decrypt_value, encrypt_value
from integrations.application.google_config import oauth_configured, oauth_redirect_uri, setup_instructions
from integrations.domain.enums import GOOGLE_OAUTH_SCOPES, ConnectionStatus, GoogleServiceType
from integrations.infrastructure.models import GoogleServiceConnection


class GoogleOAuthError(Exception):
    def __init__(self, message: str, *, setup_required: bool = False):
        super().__init__(message)
        self.setup_required = setup_required


class GoogleOAuthService:
    @staticmethod
    def get_or_create_connection(tenant_id, service_type: str) -> GoogleServiceConnection:
        conn, _ = GoogleServiceConnection.objects.get_or_create(
            tenant_id=tenant_id,
            service_type=service_type,
            defaults={"status": ConnectionStatus.NOT_CONNECTED},
        )
        return conn

    @classmethod
    def effective_status(cls, conn: GoogleServiceConnection) -> str:
        if conn.service_type == GoogleServiceType.TRENDS:
            if conn.last_error:
                return ConnectionStatus.ERROR
            return ConnectionStatus.CONNECTED
        if not oauth_configured():
            return ConnectionStatus.CONFIG_REQUIRED
        if conn.status == ConnectionStatus.WAITING_AUTHORIZATION and conn.oauth_state:
            return ConnectionStatus.WAITING_AUTHORIZATION
        if conn.encrypted_refresh_token and conn.property_id:
            return ConnectionStatus.CONNECTED
        if conn.encrypted_refresh_token and not conn.property_id:
            return ConnectionStatus.WAITING_AUTHORIZATION
        if conn.last_error:
            return ConnectionStatus.ERROR
        return ConnectionStatus.NOT_CONNECTED

    @classmethod
    def begin_connect(cls, tenant_id, service_type: str) -> dict:
        if service_type == GoogleServiceType.TRENDS:
            return {"auth_url": None, "message": "Google Trends does not require OAuth. Use Manual Sync."}
        if not oauth_configured():
            raise GoogleOAuthError(
                "Google OAuth is not configured on the server. Complete setup before connecting.",
                setup_required=True,
            )
        scopes = GOOGLE_OAUTH_SCOPES.get(service_type, [])
        if not scopes:
            raise GoogleOAuthError(f"Unknown service type: {service_type}")

        state = secrets.token_urlsafe(32)
        conn = cls.get_or_create_connection(tenant_id, service_type)
        conn.oauth_state = state
        conn.status = ConnectionStatus.WAITING_AUTHORIZATION
        conn.last_error = ""
        conn.save(update_fields=["oauth_state", "status", "last_error", "updated_at"])

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=scopes,
            state=state,
        )
        flow.redirect_uri = oauth_redirect_uri()
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return {"auth_url": auth_url, "state": state}

    @classmethod
    def handle_callback(cls, *, state: str, code: str) -> GoogleServiceConnection:
        if not oauth_configured():
            raise GoogleOAuthError("OAuth not configured", setup_required=True)
        conn = GoogleServiceConnection.objects.filter(oauth_state=state, deleted_at__isnull=True).first()
        if not conn:
            raise GoogleOAuthError("Invalid or expired OAuth state")
        scopes = GOOGLE_OAUTH_SCOPES.get(conn.service_type, [])
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=scopes,
            state=state,
        )
        flow.redirect_uri = oauth_redirect_uri()
        flow.fetch_token(code=code)
        creds = flow.credentials

        email = ""
        if getattr(creds, "id_token", None):
            try:
                from google.oauth2 import id_token as google_id_token
                from google.auth.transport.requests import Request as GoogleRequest

                info = google_id_token.verify_oauth2_token(
                    creds.id_token,
                    GoogleRequest(),
                    settings.GOOGLE_OAUTH_CLIENT_ID,
                )
                email = (info.get("email") or "").strip()
            except Exception:  # noqa: BLE001
                email = ""

        conn.encrypted_access_token = encrypt_value(creds.token or "")
        conn.encrypted_refresh_token = encrypt_value(creds.refresh_token or "")
        conn.token_expires_at = creds.expiry
        conn.oauth_state = ""
        conn.scopes = list(creds.scopes or scopes)
        conn.connected_account_email = email
        conn.status = ConnectionStatus.WAITING_AUTHORIZATION
        conn.last_error = ""
        conn.save()
        return conn

    @classmethod
    def get_credentials(cls, conn: GoogleServiceConnection) -> Credentials:
        if not conn.encrypted_refresh_token and not conn.encrypted_access_token:
            raise GoogleOAuthError("Not connected — authorize with Google first.")
        creds = Credentials(
            token=decrypt_value(conn.encrypted_access_token) or None,
            refresh_token=decrypt_value(conn.encrypted_refresh_token) or None,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
            client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
            scopes=conn.scopes or GOOGLE_OAUTH_SCOPES.get(conn.service_type, []),
        )
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            conn.encrypted_access_token = encrypt_value(creds.token or "")
            conn.token_expires_at = creds.expiry
            conn.save(update_fields=["encrypted_access_token", "token_expires_at", "updated_at"])
        return creds

    @classmethod
    def disconnect(cls, tenant_id, service_type: str) -> None:
        conn = cls.get_or_create_connection(tenant_id, service_type)
        conn.status = ConnectionStatus.NOT_CONNECTED
        conn.connected_account_email = ""
        conn.property_id = ""
        conn.property_label = ""
        conn.encrypted_access_token = ""
        conn.encrypted_refresh_token = ""
        conn.token_expires_at = None
        conn.oauth_state = ""
        conn.scopes = []
        conn.last_error = ""
        conn.save()

    @classmethod
    def serialize_connection(cls, conn: GoogleServiceConnection) -> dict:
        status = cls.effective_status(conn)
        return {
            "service_type": conn.service_type,
            "status": status,
            "connected_account": conn.connected_account_email or None,
            "property_id": conn.property_id or None,
            "property_label": conn.property_label or None,
            "last_sync_at": conn.last_sync_at.isoformat() if conn.last_sync_at else None,
            "next_sync_at": conn.next_sync_at.isoformat() if conn.next_sync_at else None,
            "last_error": conn.last_error or None,
            "sync_enabled": conn.sync_enabled,
            "oauth_configured": oauth_configured() if conn.service_type != GoogleServiceType.TRENDS else True,
            "setup_instructions": setup_instructions() if status == ConnectionStatus.CONFIG_REQUIRED else [],
        }
