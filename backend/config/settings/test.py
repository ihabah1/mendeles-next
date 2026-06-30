from .base import *  # noqa: F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

DATABASES["default"] = {  # noqa: F405
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": ":memory:",
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
JWT_SECRET_KEY = "test-jwt-secret-key-minimum-32-characters-long"
RATELIMIT_ENABLE = False
