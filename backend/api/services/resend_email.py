"""Send transactional email via Resend (https://api.resend.com/emails)."""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = 'https://api.resend.com/emails'


class ResendError(Exception):
    pass


def resend_configured() -> bool:
    return bool(getattr(settings, 'RESEND_API_KEY', '').strip())


def send_email(*, to: str, subject: str, html: str) -> dict:
    api_key = getattr(settings, 'RESEND_API_KEY', '').strip()
    from_email = getattr(settings, 'RESEND_FROM_EMAIL', '').strip()
    if not api_key or not from_email:
        raise ResendError('Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)')

    payload = {
        'from': from_email,
        'to': [to],
        'subject': subject,
        'html': html,
    }
    try:
        res = requests.post(
            RESEND_API_URL,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json=payload,
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.exception('Resend request failed')
        raise ResendError('שליחת האימייל נכשלה') from exc

    if res.status_code >= 400:
        logger.error('Resend API error %s: %s', res.status_code, res.text[:500])
        raise ResendError('שליחת האימייל נכשלה')

    return res.json()


def send_verification_email(*, to: str, verify_url: str, display_name: str) -> dict:
    name = display_name or to.split('@')[0]
    subject = 'אימות כתובת אימייל — Mandeles.co.il'
    html = f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a2d42;">
      <h2 style="color:#c9a84c;">שלום {name},</h2>
      <p>תודה שנרשמת ל-Mandeles.co.il. כדי להשלים את ההרשמה, אנא אמת את כתובת האימייל שלך:</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="{verify_url}"
           style="background:linear-gradient(135deg,#c9a84c,#e8c870);color:#0d1b2a;
                  padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
          אימות אימייל
        </a>
      </p>
      <p style="font-size:13px;color:#5a6f82;">הקישור תקף ל-{getattr(settings, 'EMAIL_VERIFICATION_HOURS', 24)} שעות.</p>
      <p style="font-size:12px;color:#8aaabe;">אם לא נרשמת לאתר, ניתן להתעלם מהודעה זו.</p>
    </div>
    """
    return send_email(to=to, subject=subject, html=html)
