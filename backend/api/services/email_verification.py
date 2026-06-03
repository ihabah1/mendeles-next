"""Email verification helpers for registration."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from admin_panel.accounts.models import EmailVerificationToken
from api.services.resend_email import ResendError, resend_configured, send_verification_email

logger = logging.getLogger(__name__)
User = get_user_model()


def verification_link(token: str) -> str:
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    return f'{base}/auth/verify-email?token={token}'


def issue_verification_email(user) -> EmailVerificationToken:
    record = EmailVerificationToken.create_for_user(user)
    url = verification_link(record.token)
    display = user.display_name if hasattr(user, 'display_name') else user.email.split('@')[0]

    if resend_configured():
        send_verification_email(to=user.email, verify_url=url, display_name=display)
    elif settings.DEBUG:
        logger.warning('RESEND not configured — verification link for %s: %s', user.email, url)
    else:
        raise ResendError('שירות אימייל לא מוגדר. פנה למנהל המערכת.')

    return record


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
    issue_verification_email(user)
