"""Phone OTP verification (SMS)."""
import logging
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from admin_panel.accounts.models import PhoneVerificationOTP
from api.services.firebase_service import firebase_configured
from api.services.sms import SmsError, normalize_phone, send_sms, sms_config_status, sms_verification_enabled

logger = logging.getLogger(__name__)
User = get_user_model()


def firebase_phone_auth_enabled() -> bool:
    return firebase_configured()


def phone_verification_enabled() -> bool:
    """Global switch: SMS step after email verification."""
    if getattr(settings, 'PHONE_VERIFICATION_ENABLED', False):
        return True
    if firebase_phone_auth_enabled():
        return True
    return sms_verification_enabled()


def phone_verification_required_for(user) -> bool:
    if not phone_verification_enabled():
        return False
    # Firebase / explicit flag: phone collected on /verify-phone after email
    if firebase_phone_auth_enabled() or getattr(settings, 'PHONE_VERIFICATION_ENABLED', False):
        return True
    if not sms_verification_enabled():
        return False
    return bool((user.phone or '').strip())


def phone_verification_status() -> dict:
    from api.services.firebase_service import firebase_config_status

    fb = firebase_config_status()
    enabled = phone_verification_enabled()
    return {
        'enabled': enabled,
        'required_after_email': enabled,
        'firebase_backend': fb,
        'firebase_ready': fb.get('configured', False),
        'sms_legacy': sms_verification_enabled(),
        'hint': None
        if enabled and fb.get('configured')
        else (
            'הוסף FIREBASE_SERVICE_ACCOUNT_JSON ב-Backend + NEXT_PUBLIC_FIREBASE_* ב-Frontend'
            if enabled
            else 'הגדר PHONE_VERIFICATION_ENABLED=true ו-FIREBASE_SERVICE_ACCOUNT_JSON'
        ),
    }


def mark_phone_verified_from_firebase(user, *, phone_e164: str) -> User:
    user.phone_verified = True
    user.phone = phone_e164
    if user.email_verified:
        user.is_active = True
    user.save(update_fields=['phone_verified', 'phone', 'is_active'])
    return user


def issue_phone_otp(user) -> dict:
    if not phone_verification_required_for(user):
        return {'phone_verification_required': False}

    e164 = normalize_phone(user.phone)
    code = f'{secrets.randbelow(1_000_000):06d}'
    record = PhoneVerificationOTP.create_for_user(user, code=code, phone_e164=e164)

    minutes = int(getattr(settings, 'SMS_OTP_MINUTES', 10))
    body = f'קוד אימות Mandeles: {code}. תקף ל-{minutes} דקות.'
    send_sms(to_e164=e164, body=body)

    logger.info('Phone OTP issued for user=%s phone=***%s', user.email, e164[-4:])
    out = {
        'phone_verification_required': True,
        'phone': e164,
        'detail': 'נשלח קוד אימות ל-SMS.',
    }
    if settings.DEBUG and sms_config_status().get('provider') == 'log':
        out['dev_otp'] = code
    return out


def verify_phone_code(*, email: str, code: str) -> User:
    email = (email or '').strip().lower()
    code = (code or '').strip()
    if not email or not code:
        raise ValueError('נדרשים אימייל וקוד')

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        raise ValueError('משתמש לא נמצא')

    record = (
        PhoneVerificationOTP.objects.filter(user=user, used_at__isnull=True)
        .order_by('-created_at')
        .first()
    )
    if not record or not record.is_valid():
        raise ValueError('קוד לא תקף או שפג תוקפו')

    if record.attempts >= int(getattr(settings, 'SMS_OTP_MAX_ATTEMPTS', 5)):
        raise ValueError('יותר מדי ניסיונות — בקש קוד חדש')

    record.attempts += 1
    record.save(update_fields=['attempts'])

    if not check_password(code, record.code_hash):
        raise ValueError('קוד שגוי')

    user.phone_verified = True
    user.phone = record.phone_e164
    if user.email_verified:
        user.is_active = True
    user.save(update_fields=['phone_verified', 'phone', 'is_active'])

    record.used_at = timezone.now()
    record.save(update_fields=['used_at'])
    PhoneVerificationOTP.objects.filter(user=user, used_at__isnull=True).exclude(pk=record.pk).delete()
    return user


def resend_phone_otp(email: str) -> None:
    email = email.lower().strip()
    user = User.objects.filter(email__iexact=email).first()
    if not user or user.phone_verified:
        return
    if not phone_verification_required_for(user):
        return
    issue_phone_otp(user)
