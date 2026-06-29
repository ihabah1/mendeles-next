from .base import *  # noqa: F403

DEBUG = False
JWT_REFRESH_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"  # noqa: F405
# Railway healthchecks hit HTTP without X-Forwarded-Proto; exempt the health endpoint from SSL redirect.
SECURE_REDIRECT_EXEMPT = [r"^/api/v1/health/?$"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
