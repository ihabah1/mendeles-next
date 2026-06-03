"""
Django settings for Mandeles Portal – WEB + mobile-responsive admin.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'dev-only-change-in-production-mandeles-2026',
)

DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() in ('1', 'true', 'yes')


def _allowed_hosts():
    hosts = set()
    for host in os.getenv('ALLOWED_HOSTS', '').split(','):
        host = host.strip()
        if host:
            hosts.add(host)
    railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '').strip()
    if railway_domain:
        hosts.add(railway_domain)
        hosts.add('.up.railway.app')
    # Railway health checks always send Host: healthcheck.railway.app (not *.up.railway.app)
    hosts.add('healthcheck.railway.app')
    if DEBUG:
        hosts.update(['localhost', '127.0.0.1', '[::1]'])
    if not hosts:
        hosts.update(['localhost', '127.0.0.1'])
    return sorted(hosts)


def _csrf_trusted_origins():
    origins = set()
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(','):
        origin = origin.strip()
        if origin:
            origins.add(origin)
    railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '').strip()
    if railway_domain:
        origins.add(f'https://{railway_domain}')
    # כל host מותר → origin ל-CSRF (נדרש ל-POST מאותו דומיין ב-Django 4+)
    for host in _allowed_hosts():
        if not host or host.startswith('.') or host.startswith('['):
            continue
        origins.add(f'https://{host}')
        if DEBUG:
            origins.add(f'http://{host}')
    return sorted(origins)


ALLOWED_HOSTS = _allowed_hosts()
CSRF_TRUSTED_ORIGINS = _csrf_trusted_origins()

# ── Feature flags ─────────────────────────────────────────────────────────────
# The custom /manage dashboard pulls in the AI-agent views (heavy optional deps).
# Keep it opt-in so the core REST API + Django admin boot with a minimal stack.
PORTAL_DASHBOARD_ENABLED = os.getenv('PORTAL_DASHBOARD_ENABLED', 'true').lower() in ('1', 'true', 'yes')
AI_AGENT_ENABLED = os.getenv('AI_AGENT_ENABLED', 'true').lower() in ('1', 'true', 'yes')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party: REST API + JWT auth + CORS
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    # Local apps
    'admin_panel.accounts.apps.AccountsConfig',
    'admin_panel.portal',
    'api',
]

if AI_AGENT_ENABLED:
    INSTALLED_APPS.append('admin_panel.ai_agent')

# שירותי Flask מקומיים (לוטו / ארנק / טוטו) – פרוקסי דרך Django
LEGACY_SERVICES_ENABLED = os.getenv('LEGACY_SERVICES_ENABLED', 'true').lower() in ('1', 'true', 'yes')
LEGACY_AUTO_START = os.getenv('LEGACY_AUTO_START', 'true').lower() in ('1', 'true', 'yes')
LEGACY_ENGINE_URL = os.getenv('LEGACY_ENGINE_URL', 'http://127.0.0.1:5001')
LEGACY_AUTH_URL = os.getenv('LEGACY_AUTH_URL', 'http://127.0.0.1:5002')
LEGACY_WALLET_URL = os.getenv('LEGACY_WALLET_URL', 'http://127.0.0.1:5003')
LEGACY_LOTTO_API_URL = os.getenv('LEGACY_LOTTO_API_URL', 'http://127.0.0.1:5000')
LEGACY_PROXY_TIMEOUT = int(os.getenv('LEGACY_PROXY_TIMEOUT', '120'))

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # CORS must come before CommonMiddleware so headers are added to every response.
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# The dashboard guard reverses portal: URLs at import time, so only enable it
# when the /manage dashboard URLs are actually mounted.
if PORTAL_DASHBOARD_ENABLED:
    MIDDLEWARE.append('admin_panel.portal.middleware.AdminDashboardGuardMiddleware')

ROOT_URLCONF = 'mandeles_portal.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'admin_panel.portal.context_processors.dashboard_context',
                'admin_panel.portal.context_processors.page_code_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'mandeles_portal.wsgi.application'
ASGI_APPLICATION = 'mandeles_portal.asgi.application'


def _configure_databases():
    """SQLite locally; Postgres via DATABASE_URL; always ensure DB path is writable."""
    database_url = os.getenv('DATABASE_URL', '').strip()
    if database_url:
        import dj_database_url

        return {
            'default': dj_database_url.config(
                default=database_url,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }

    sqlite_path = os.getenv('SQLITE_PATH', '').strip()
    if sqlite_path:
        db_path = Path(sqlite_path)
    else:
        default_data = '/tmp/mendeles-data' if not DEBUG else str(BASE_DIR / 'data')
        data_dir = Path(os.getenv('DATA_DIR', default_data))
        data_dir.mkdir(parents=True, exist_ok=True)
        db_path = data_dir / 'portal.db'

    db_path.parent.mkdir(parents=True, exist_ok=True)
    return {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': db_path,
        }
    }


DATABASES = _configure_databases()

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 4}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'he'
TIME_ZONE = 'Asia/Jerusalem'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

if PORTAL_DASHBOARD_ENABLED:
    LOGIN_URL = 'portal:login'
    LOGIN_REDIRECT_URL = 'portal:dashboard'
    LOGOUT_REDIRECT_URL = 'portal:login'
else:
    LOGIN_URL = '/admin/login/'
    LOGIN_REDIRECT_URL = '/admin/'
    LOGOUT_REDIRECT_URL = '/admin/login/'

SESSION_COOKIE_AGE = 60 * 60 * 12
SESSION_SAVE_EVERY_REQUEST = True

# Custom admin dashboard path (not /admin/)
ADMIN_DASHBOARD_PREFIX = 'manage'

APP_VERSION = '2.2.8'

# מנהל יחיד לדשבורד /manage/
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@admin.com')

# Superuser קבוע — נוצר/מתוקן אוטומטית אחרי כל migrate (ראה accounts/bootstrap.py)
BOOTSTRAP_ADMIN_EMAIL = os.getenv('BOOTSTRAP_ADMIN_EMAIL', ADMIN_EMAIL)
BOOTSTRAP_ADMIN_PASSWORD = os.getenv('BOOTSTRAP_ADMIN_PASSWORD', 'admin')
BOOTSTRAP_ADMIN_ENABLED = os.getenv('BOOTSTRAP_ADMIN_ENABLED', 'true').lower() in (
    '1', 'true', 'yes',
)

# ── AI Agent (Django Admin → Gemini → PR) ─────────────────────────────────────
# AI_AGENT_ENABLED is defined near INSTALLED_APPS (controls app loading).
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
def _env_clean(key: str, default: str = '') -> str:
    return (os.getenv(key, default) or default).strip().replace('\r', '').replace('\n', '')


GITHUB_TOKEN = _env_clean('GITHUB_TOKEN')
_github_repo_raw = _env_clean('GITHUB_REPO', 'ihabah1/mendeles-next')
if _github_repo_raw.endswith('.git'):
    _github_repo_raw = _github_repo_raw[:-4].rstrip('/')
GITHUB_REPO = _github_repo_raw
GITHUB_DEFAULT_BRANCH = _env_clean('GITHUB_DEFAULT_BRANCH', 'main')
AI_AGENT_WORK_DIR = os.getenv('AI_AGENT_WORK_DIR', '/tmp/ai-agent-repos')


# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        # Session auth keeps the browsable API + Django admin usable during dev.
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
}

# ── SimpleJWT ─────────────────────────────────────────────────────────────────
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_MINUTES', '60'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '30'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS (React frontend → Django API) ────────────────────────────────────────
def _split_env_list(key: str, default: str = '') -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = _split_env_list(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000',
)
# ── Resend (email verification on registration) ───────────────────────────────
RESEND_API_KEY = _env_clean('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = _env_clean('RESEND_FROM_EMAIL', '')
EMAIL_VERIFICATION_HOURS = int(os.getenv('EMAIL_VERIFICATION_HOURS', '24'))
# Same secret on Frontend + Backend — allows Next.js to send verification email via Resend
EMAIL_PROXY_SECRET = _env_clean('EMAIL_PROXY_SECRET', '')

_frontend_url = os.getenv('FRONTEND_URL', '').strip().rstrip('/')
if _frontend_url and _frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(_frontend_url)
# Allow cookies/Authorization headers from the SPA.
CORS_ALLOW_CREDENTIALS = True
# Frontend origins are also trusted for CSRF (needed for session-auth fallback).
for _origin in CORS_ALLOWED_ORIGINS:
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)
