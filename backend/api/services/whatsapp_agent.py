"""WhatsApp business agent — Twilio webhook + Gemini replies."""
from __future__ import annotations

import logging
import re
import xml.sax.saxutils as xml_escape

from django.conf import settings

from admin_panel.accounts.models import User
from admin_panel.portal.models import Document

logger = logging.getLogger(__name__)

SITE_CONTEXT = """
מנדלס — פלטפורמה לעסקים בישראל:
- יצירת מסמכים (הצעת מחיר, סיכום ביקור, סיכום שיחה) עם AI
- העלאת לוגו ומילוי אוטומטי
- שליחה לחתימה דיגיטלית ומעקב סטטוס
- אתר: /dashboard ליצירת מסמך, /auth להרשמה
"""

STATUS_LABELS = dict(Document.Status.choices)


def whatsapp_enabled() -> bool:
    raw = getattr(settings, 'WHATSAPP_AGENT_ENABLED', False)
    if isinstance(raw, str):
        return raw.strip().lower() in ('1', 'true', 'yes', 'on')
    return bool(raw)


def whatsapp_config_status() -> dict:
    from api.services.sms import _twilio_sid, _twilio_token

    wa_from = _whatsapp_from()
    sid = _twilio_sid()
    token = _twilio_token()
    gemini = bool((getattr(settings, 'GEMINI_API_KEY', '') or '').strip())
    configured = whatsapp_enabled() and bool(sid and token and wa_from)
    return {
        'enabled': whatsapp_enabled(),
        'configured': configured,
        'twilio': bool(sid and token),
        'whatsappFrom': wa_from or None,
        'gemini': gemini,
        'hint': None
        if configured
        else 'הגדר WHATSAPP_AGENT_ENABLED=true, TWILIO_* ו-TWILIO_WHATSAPP_FROM (whatsapp:+...)',
    }


def _whatsapp_from() -> str:
    return (getattr(settings, 'TWILIO_WHATSAPP_FROM', '') or '').strip()


def _normalize_wa_phone(raw: str) -> str:
    """Strip whatsapp: prefix → E.164 digits for lookup."""
    s = (raw or '').strip()
    if s.lower().startswith('whatsapp:'):
        s = s.split(':', 1)[1]
    return re.sub(r'\D', '', s)


def _phone_variants(digits: str) -> list[str]:
    if not digits:
        return []
    variants = {digits}
    if digits.startswith('972'):
        variants.add('0' + digits[3:])
        variants.add('+' + digits)
    elif digits.startswith('0'):
        variants.add('972' + digits[1:])
        variants.add('+972' + digits[1:])
    return list(variants)


def _find_user_by_phone(wa_from: str) -> User | None:
    digits = _normalize_wa_phone(wa_from)
    if not digits:
        return None
    try:
        for variant in _phone_variants(digits):
            q = variant
            user = User.objects.filter(phone__icontains=q[-9:]).first() if len(q) >= 9 else None
            if user:
                return user
        return User.objects.filter(phone__icontains=digits[-9:]).first() if len(digits) >= 9 else None
    except Exception as exc:
        logger.warning('WhatsApp user lookup failed: %s', exc)
        return None


def _document_status_reply(user: User | None, wa_from: str) -> str | None:
    if not user:
        return (
            'לא מצאתי חשבון המשויך למספר זה. '
            'הירשם באתר עם אותו מספר, או צור מסמך כאורח ב: '
            f'{_public_base()}/dashboard'
        )
    try:
        docs = list(Document.objects.filter(owner=user).order_by('-created_at')[:5])
    except Exception as exc:
        logger.warning('WhatsApp document lookup failed: %s', exc)
        return (
            f'שלום {user.display_name or ""}! לא הצלחתי לטעון מסמכים כרגע. '
            f'נסה שוב או היכנס ל-{_public_base()}/dashboard'
        )
    if not docs:
        return (
            f'שלום {user.display_name or ""}! עדיין אין מסמכים בחשבון. '
            f'צור מסמך ב-{_public_base()}/dashboard — כתוב נושא והעלה לוגו.'
        )
    lines = [f'שלום {user.display_name or "לקוח"}! המסמכים האחרונים שלך:']
    for d in docs:
        st = STATUS_LABELS.get(d.status, d.status)
        lines.append(f'• {d.title} — {st} ({d.document_number})')
    lines.append(f'ליצירת מסמך חדש: {_public_base()}/dashboard')
    return '\n'.join(lines)


def _public_base() -> str:
    return (getattr(settings, 'FRONTEND_URL', '') or 'https://mendeles-next-production.up.railway.app').rstrip('/')


def _local_reply(message: str, user: User | None, wa_from: str) -> str | None:
    q = (message or '').strip().lower()
    if not q:
        return (
            'שלום! אני סוכן מנדלס ב-WhatsApp.\n'
            'אפשר לשאול: סטטוס מסמך, איך יוצרים הצעת מחיר, או לתאר מסמך ואכוון אותך.'
        )

    if any(k in q for k in ('סטטוס', 'מסמכ', 'הצעה', 'חתימ', 'איפה המסמך', 'נשלח')):
        return _document_status_reply(user, wa_from)

    if any(k in q for k in ('צור', 'יציר', 'הצעת מחיר', 'חדש', 'להתחיל', 'איך')):
        return (
            f'ליצירת מסמך:\n'
            f'1. היכנס ל-{_public_base()}/dashboard\n'
            f'2. כתוב נושא (למשל הצעת מחיר לשיפוץ)\n'
            f'3. העלה לוגו (אופציונלי)\n'
            f'4. לחץ "צור מסמך עם AI"\n'
            f'אפשר גם כאורח — הרשמה שומרת את המסמכים בענן.'
        )

    if any(k in q for k in ('נציג', 'אנושי', 'תמיכה', 'דבר עם')):
        return 'העברתי את הפנייה לצוות. נחזור אליך בהקדם. תודה על הסבלנות!'

    if any(k in q for k in ('שלום', 'היי', 'הי', 'בוקר', 'ערב')):
        name = (user.display_name if user else '') or 'שם'
        return (
            f'שלום{" " + name if user else ""}! '
            f'אני עוזר מנדלס — מסמכים, חתימה ו-AI.\n'
            f'שאל "סטטוס" או "איך יוצרים מסמך".'
        )

    return None


def _gemini_reply(message: str, user: User | None) -> str | None:
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    if not api_key.strip():
        return None
    try:
        import google.generativeai as genai
    except ImportError:
        return None

    profile = ''
    if user:
        profile = f'הלקוח מחובר: {user.display_name}, {user.email}.'

    system = f"""אתה סוכן WhatsApp של מנדלס — מסמכים חכמים לעסקים.
ענה בעברית, קצר (עד 4 משפטים), ידידותי ומקצועי.
{SITE_CONTEXT}
{profile}
אם שואלים סטטוס — הפנה לבדוק ב-dashboard או שאל אם רשום באתר.
אל תמציא מספרי מסמכים. אם לא יודע — הצע ליצור קשר עם צוות או לבקר ב-dashboard.
אל תשתמש ב-markdown."""

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash'),
            system_instruction=system,
        )
        result = model.generate_content((message or '').strip()[:800])
        text = (getattr(result, 'text', None) or '').strip()
        return text[:1200] if text else None
    except Exception as exc:
        logger.warning('WhatsApp Gemini failed: %s', exc)
        return None


def build_whatsapp_reply(*, from_wa: str, body: str) -> str:
    """Main entry — local intents first, then Gemini, then fallback."""
    user = _find_user_by_phone(from_wa)
    local = _local_reply(body, user, from_wa)
    if local:
        return local
    ai = _gemini_reply(body, user)
    if ai:
        return ai
    return (
        'תודה על הפנייה! אני יכול לעזור בסטטוס מסמכים, יצירת הצעת מחיר וחתימה דיגיטלית.\n'
        f'צור מסמך: {_public_base()}/dashboard'
    )


def twiml_message(text: str) -> str:
    safe = xml_escape.escape((text or '')[:1500])
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
