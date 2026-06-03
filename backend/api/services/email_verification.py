"""Email verification helpers for registration."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from admin_panel.accounts.models import EmailVerificationToken
from api.services.email_proxy_secret import get_email_proxy_secret
from api.services.resend_email import (
    ResendError,
    resend_configured,
    resend_setup_error_hebrew,
    send_verification_email,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def verification_link(token: str) -> str:
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    return f'{base}/auth/verify-email?token={token}'


def frontend_email_proxy_enabled() -> bool:
    """True when Next.js can send verification email (Resend on Frontend)."""
    if get_email_proxy_secret():
        return True
    return bool(getattr(settings, 'FRONTEND_URL', '').strip()) and not settings.DEBUG


def verification_payload_for_user(user) -> dict:
    record = EmailVerificationToken.create_for_user(user)
    url = verification_link(record.token)
    display = user.display_name if hasattr(user, 'display_name') else user.email.split('@')[0]
    return {
        'to': user.email,
        'display_name': display,
        'verify_url': url,
    }


def issue_verification_email(user) -> EmailVerificationToken:
    payload = verification_payload_for_user(user)
    send_verification_email(
        to=payload['to'],
        verify_url=payload['verify_url'],
        display_name=payload['display_name'],
    )
    return EmailVerificationToken.objects.filter(user=user).order_by('-created_at').first()


def issue_verification_or_delegate(user) -> dict:
    """Send via backend Resend, or delegate to Frontend /api/email/send-verification."""
    if resend_configured():
        issue_verification_email(user)
        return {
            'detail': 'נשלח אימייל לאימות. בדוק את תיבת הדואר (גם בספאם).',
            'email': user.email,
            'verification_required': True,
            'email_send_via': 'backend',
        }

    if settings.DEBUG:
        payload = verification_payload_for_user(user)
        logger.warning(
            'RESEND not configured — verification link for %s: %s',
            user.email,
            payload['verify_url'],
        )
        return {
            'detail': 'נרשמת (מצב פיתוח). בדוק לוגים לקישור אימות.',
            'email': user.email,
            'verification_required': True,
            'email_send_via': 'dev-log',
        }

    if frontend_email_proxy_enabled():
        verification_payload_for_user(user)
        return {
            'detail': 'נשלח אימייל לאימות. בדוק את תיבת הדואר (גם בספאם).',
            'email': user.email,
            'verification_required': True,
            'email_send_via': 'frontend',
        }

    raise ResendError(resend_setup_error_hebrew() or 'שירות אימייל לא מוגדר. פנה למנהל המערכת.')


def verify_token(raw_token: str) -> User:
    token = (raw_token or '').strip()
    if not token:
        raise ValueError('חסר אסימון אימות')

    record = (
        EmailVerificationToken.objects.select_related('user')
        .filter(token=token, used_at__isnull=True)
        .first()
    )
    if not record or not record.is_valid():
        raise ValueError('קישור האימות לא תקף או שפג תוקפו')

    user = record.user
    user.email_verified = True
    user.is_active = True
    user.save(update_fields=['email_verified', 'is_active'])

    from django.utils import timezone

    record.used_at = timezone.now()
    record.save(update_fields=['used_at'])
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).exclude(pk=record.pk).delete()
    return user


def resend_for_email(email: str) -> None:
    email = email.lower().strip()
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return
    if user.email_verified:
        return
    if resend_configured():
        issue_verification_email(user)
        return
    if frontend_email_proxy_enabled():
        verification_payload_for_user(user)
        return
    raise ResendError(resend_setup_error_hebrew())
