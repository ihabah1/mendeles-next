"""Google OAuth platform configuration — credentials from environment only."""

from django.conf import settings


GOOGLE_SETUP_INSTRUCTIONS = [
    "Open Google Cloud Console: https://console.cloud.google.com/",
    "Create or select a project for Mendeles.",
    "Enable APIs: Google Search Console API, Google Analytics Data API, and Google Analytics Admin API.",
    "Go to APIs & Services → Credentials → Create Credentials → OAuth client ID.",
    "Application type: Web application.",
    "Add Authorized redirect URI (backend callback): {redirect_uri}",
    "Copy Client ID and Client Secret into Railway/backend environment variables.",
    "Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI.",
    "Generate a random INTEGRATIONS_ENCRYPTION_KEY (32+ chars) for token encryption.",
    "Redeploy the backend, then return here and click Connect.",
]


def oauth_configured() -> bool:
    return bool(
        getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        and getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
        and getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
    )


def oauth_redirect_uri() -> str:
    return getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "").rstrip("/")


def frontend_oauth_return_url() -> str:
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/dashboard/settings/integrations/google"


def setup_instructions() -> list[str]:
    redirect = oauth_redirect_uri() or "https://YOUR-BACKEND/api/v1/integrations/google/oauth/callback/"
    return [step.format(redirect_uri=redirect) for step in GOOGLE_SETUP_INSTRUCTIONS]
