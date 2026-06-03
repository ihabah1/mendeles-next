"""Shared secret so Next.js (Frontend) can call verification-payload on Django."""
import hashlib
import os

from django.conf import settings

_SALT = 'mandeles-email-proxy:'


def get_email_proxy_secret() -> str:
    """Explicit EMAIL_PROXY_SECRET, or derived from DJANGO_SECRET_KEY."""
    explicit = (
        getattr(settings, 'EMAIL_PROXY_SECRET', '')
        or os.getenv('EMAIL_PROXY_SECRET', '')
    ).strip()
    if explicit:
        return explicit
    secret_key = (getattr(settings, 'SECRET_KEY', '') or '').strip()
    if secret_key:
        return hashlib.sha256(f'{_SALT}{secret_key}'.encode()).hexdigest()
    return ''


def verify_email_proxy_secret(incoming: str) -> bool:
    expected = get_email_proxy_secret()
    if not expected:
        return False
    return (incoming or '').strip() == expected
