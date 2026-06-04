"""SMS delivery for phone OTP (log = free dev, twilio = production trial)."""
import logging
import os
import re

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class SmsError(Exception):
    pass


def normalize_phone(raw: str) -> str:
    """Normalize Israeli/local numbers to E.164 (+972...)."""
    digits = re.sub(r'\D', '', (raw or '').strip())
    if not digits:
        raise SmsError('מספר טלפון לא תקין')
    if digits.startswith('972'):
        return f'+{digits}'
    if digits.startswith('0') and len(digits) >= 9:
        return f'+972{digits[1:]}'
    if len(digits) >= 9:
        return f'+{digits}'
    raise SmsError('מספר טלפון לא תקין')


def sms_provider() -> str:
    return (getattr(settings, 'SMS_PROVIDER', '') or os.getenv('SMS_PROVIDER', 'log')).strip().lower()


def sms_verification_enabled() -> bool:
    if not getattr(settings, 'SMS_VERIFICATION_ENABLED', False):
        return False
    phone = (getattr(settings, 'SMS_PROVIDER', '') or '').strip()
    return phone != 'none'


def sms_config_status() -> dict:
    provider = sms_provider()
    if not sms_verification_enabled():
        return {
            'enabled': False,
            'provider': provider,
            'configured': False,
            'hint': 'SMS_VERIFICATION_ENABLED=false',
        }
    if provider == 'log':
        return {
            'enabled': True,
            'provider': 'log',
            'configured': True,
            'hint': 'מצב פיתוח: קוד OTP מודפס בלוגי Backend (חינם)',
        }
    if provider == 'twilio':
        sid = _twilio_sid()
        token = _twilio_token()
        from_num = _twilio_from()
        ok = bool(sid and token and from_num)
        return {
            'enabled': True,
            'provider': 'twilio',
            'configured': ok,
            'hint': None
            if ok
            else 'הוסף TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
        }
    return {
        'enabled': True,
        'provider': provider,
        'configured': False,
        'hint': 'SMS_PROVIDER חייב להיות log או twilio',
    }


def _twilio_sid() -> str:
    return (getattr(settings, 'TWILIO_ACCOUNT_SID', '') or os.getenv('TWILIO_ACCOUNT_SID', '')).strip()


def _twilio_token() -> str:
    return (getattr(settings, 'TWILIO_AUTH_TOKEN', '') or os.getenv('TWILIO_AUTH_TOKEN', '')).strip()


def _twilio_from() -> str:
    return (getattr(settings, 'TWILIO_FROM_NUMBER', '') or os.getenv('TWILIO_FROM_NUMBER', '')).strip()


def send_sms(*, to_e164: str, body: str) -> None:
    provider = sms_provider()
    if provider == 'log':
        logger.warning('[SMS log provider] to=%s body=%s', to_e164, body)
        return
    if provider == 'twilio':
        _send_twilio(to_e164=to_e164, body=body)
        return
    raise SmsError('שירות SMS לא מוגדר. הגדר SMS_PROVIDER=log (פיתוח) או twilio.')


def _send_twilio(*, to_e164: str, body: str) -> None:
    sid = _twilio_sid()
    token = _twilio_token()
    from_num = _twilio_from()
    if not (sid and token and from_num):
        raise SmsError('Twilio לא מוגדר — הוסף TWILIO_* ב-Railway Backend.')

    url = f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json'
    try:
        res = requests.post(
            url,
            auth=(sid, token),
            data={'From': from_num, 'To': to_e164, 'Body': body},
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.exception('Twilio request failed')
        raise SmsError('שליחת SMS נכשלה — נסה שוב מאוחר יותר.') from exc

    if res.status_code >= 400:
        logger.error('Twilio error %s: %s', res.status_code, res.text[:500])
        raise SmsError('שליחת SMS נכשלה — בדוק מספר שולח ב-Twilio.')

    logger.info('Twilio SMS sent to %s', to_e164[-4:].rjust(len(to_e164), '*'))
