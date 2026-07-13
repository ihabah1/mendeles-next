import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

from identity.infrastructure.email_config import resolve_from_email
from seo.application.site_url import resolve_site_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,.railway.app").split(",") if h.strip()]
# Railway healthchecks use healthcheck.railway.app; always allow *.railway.app in deploy.
for _host in (".railway.app", "healthcheck.railway.app", ".railway.internal"):
    if _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "core",
    "tenancy",
    "identity",
    "rbac",
    "audit",
    "siteconfig",
    "seo",
    "content",
    "leads",
    "automation",
    "integrations",
    "whatsapp",
    "social.apps.SocialConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "core.middleware.request_id.RequestIdMiddleware",
    "core.middleware.security_headers.SecurityHeadersMiddleware",
    "core.middleware.tenant_context.TenantContextMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

AUTH_USER_MODEL = "identity.User"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "mendeles"),
        "USER": os.environ.get("POSTGRES_USER", "mendeles"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "mendeles"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

if url := os.environ.get("DATABASE_URL"):
    import dj_database_url

    DATABASES["default"] = dj_database_url.parse(url, conn_max_age=60)

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "identity" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

TIME_ZONE = "Asia/Jerusalem"
LANGUAGE_CODE = "he"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "identity.infrastructure.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "core.exceptions.handlers.api_exception_handler",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Mendeles API",
    "DESCRIPTION": "Lead Generation Platform API v1",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

JWT_ACCESS_TTL = timedelta(minutes=int(os.environ.get("JWT_ACCESS_TTL_MINUTES", "15")))
JWT_REFRESH_TTL = timedelta(days=int(os.environ.get("JWT_REFRESH_TTL_DAYS", "7")))
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
JWT_ALGORITHM = "HS256"
JWT_REFRESH_COOKIE_NAME = "mendeles_refresh"
JWT_REFRESH_COOKIE_PATH = "/api/v1/auth/"
JWT_REFRESH_COOKIE_SECURE = os.environ.get("JWT_COOKIE_SECURE", "false").lower() == "true"
JWT_REFRESH_COOKIE_SAMESITE = os.environ.get("JWT_COOKIE_SAMESITE", "Lax")

EMAIL_VERIFICATION_TTL = timedelta(hours=int(os.environ.get("EMAIL_VERIFICATION_TTL_HOURS", "48")))
PASSWORD_RESET_TTL = timedelta(hours=int(os.environ.get("PASSWORD_RESET_TTL_HOURS", "2")))

FRONTEND_URL = resolve_site_url(os.environ.get("FRONTEND_URL", "http://localhost:3000"))
APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")

# Google OAuth (Search Console + GA4) — set in production; never commit secrets
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", "")
GOOGLE_OAUTH_REDIRECT_URI = os.environ.get("GOOGLE_OAUTH_REDIRECT_URI", "").rstrip("/")
INTEGRATIONS_ENCRYPTION_KEY = os.environ.get("INTEGRATIONS_ENCRYPTION_KEY", "")

# AI content generation (flag only until Phase 7)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT_SECONDS", "30"))
AI_SEO_STEP_TIMEOUT_SECONDS = int(os.environ.get("AI_SEO_STEP_TIMEOUT_SECONDS", "10"))
AI_SEO_STEP_MAX_RETRIES = int(os.environ.get("AI_SEO_STEP_MAX_RETRIES", "3"))
GOOGLE_TRENDS_TIMEOUT_SECONDS = int(os.environ.get("GOOGLE_TRENDS_TIMEOUT_SECONDS", "20"))

# Buffer social publishing (server-side only)
BUFFER_ACCESS_TOKEN = os.environ.get("BUFFER_ACCESS_TOKEN", "")

RATELIMIT_ENABLE = os.environ.get("RATELIMIT_ENABLE", "true").lower() == "true"

DEFAULT_FROM_EMAIL = resolve_from_email()
if os.environ.get("RESEND_API_KEY", "").strip():
    EMAIL_BACKEND = os.environ.get(
        "EMAIL_BACKEND",
        "identity.infrastructure.resend_backend.ResendEmailBackend",
    )
else:
    EMAIL_BACKEND = os.environ.get(
        "EMAIL_BACKEND",
        "django.core.mail.backends.console.EmailBackend",
    )

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "core.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
