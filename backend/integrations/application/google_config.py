"""Google OAuth platform configuration — credentials from environment only."""

from django.conf import settings


GOOGLE_SETUP_INSTRUCTIONS = [
    "Open Google Cloud Console: https://console.cloud.google.com/",
    "Create or select a project for Mendeles.",
    "Enable APIs: Google Search Console API, Google Analytics Data API, and Google Analytics Admin API.",
    "Go to APIs & Services → Credentials → OAuth client ID (Web application).",
    "Add Authorized redirect URI exactly: {redirect_uri}",
    "Also keep the Google Sign-In URI if used: https://mendeles.com/oauth/google/callback",
    "Copy Client ID and Client Secret into Railway/backend environment variables.",
    "Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (optional GOOGLE_OAUTH_REDIRECT_URI).",
    "Generate a random INTEGRATIONS_ENCRYPTION_KEY (32+ chars) for token encryption.",
    "Redeploy the backend, then return here and click Connect.",
]


def _frontend_integrations_callback_path() -> str:
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/oauth/google/integrations/callback" if base else ""


def oauth_configured() -> bool:
    return bool(
        getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        and getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
        and oauth_redirect_uri()
    )


def oauth_redirect_uri() -> str:
    """OAuth redirect URI for Search Console / GA4 connect.

    Prefer the public frontend callback on mendeles.com so Google Console only
    needs site-domain URIs (same pattern as Google Sign-In). Legacy Railway
    backend callback URLs in env are rewritten automatically.
    """
    explicit = (getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "") or "").strip().rstrip("/")
    frontend = _frontend_integrations_callback_path()
    if explicit:
        if "/api/v1/integrations/google/oauth/callback" in explicit and frontend:
            return frontend
        return explicit
    return frontend


def frontend_oauth_return_url() -> str:
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/dashboard/settings/integrations/google"


def setup_instructions() -> list[str]:
    redirect = oauth_redirect_uri() or "https://mendeles.com/oauth/google/integrations/callback"
    return [step.format(redirect_uri=redirect) for step in GOOGLE_SETUP_INSTRUCTIONS]
