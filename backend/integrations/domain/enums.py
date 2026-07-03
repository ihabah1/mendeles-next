from django.db import models


class GoogleServiceType(models.TextChoices):
    SEARCH_CONSOLE = "search_console", "Google Search Console"
    ANALYTICS = "analytics", "Google Analytics 4"
    TRENDS = "trends", "Google Trends"


class ConnectionStatus(models.TextChoices):
    NOT_CONNECTED = "not_connected", "Not Connected"
    CONFIG_REQUIRED = "config_required", "Configuration Required"
    WAITING_AUTHORIZATION = "waiting_authorization", "Waiting for Authorization"
    CONNECTED = "connected", "Connected"
    ERROR = "error", "Error"


class SyncStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"


class TrendsDateRange(models.TextChoices):
    HOURS_24 = "24h", "Last 24 Hours"
    DAYS_7 = "7d", "Last 7 Days"
    DAYS_30 = "30d", "Last 30 Days"


class TrendsCountry(models.TextChoices):
    ISRAEL = "IL", "Israel"
    UNITED_STATES = "US", "United States"


# pytrends: geo uses ISO codes; trending_searches(pn=) uses country slug
TRENDS_MARKET_CONFIG: dict[str, dict[str, str]] = {
    TrendsCountry.ISRAEL: {
        "geo": "IL",
        "pn": "israel",
        "default_language": "he",
    },
    TrendsCountry.UNITED_STATES: {
        "geo": "US",
        "pn": "united_states",
        "default_language": "en",
    },
}


# OAuth scopes per service
GOOGLE_OAUTH_SCOPES: dict[str, list[str]] = {
    GoogleServiceType.SEARCH_CONSOLE: [
        "https://www.googleapis.com/auth/webmasters.readonly",
        "openid",
        "email",
        "profile",
    ],
    GoogleServiceType.ANALYTICS: [
        "https://www.googleapis.com/auth/analytics.readonly",
        "openid",
        "email",
        "profile",
    ],
}
