"""Detect support escalation from site chat and notify staff."""
from django.conf import settings
from django.contrib.auth import get_user_model

from admin_panel.portal.models import ActionLog

from api.services.customer_messages import send_system_message
from api.staff import is_staff_portal_user

HUMAN_KEYWORDS = (
    'נציג',
    'נציגה',
    'בן אדם',
    'אדם אמיתי',
    'לדבר עם',
    'שיחה עם',
    'תמיכה',
    'צור קשר',
    'תתקשרו',
    'תחזרו',
    'בעיה',
    'תלונה',
    'לא עובד',
    'עזרה אנושית',
    'מישהו',
    'מישהי',
    'שירות לקוחות',
    'לדבר איתכם',
    'דחוף',
    'ביטול הזמנה',
    'החזר כספי',
    'החזר',
)

User = get_user_model()


def wants_human_agent(message: str) -> bool:
    q = (message or '').strip().lower()
    if not q:
        return False
    if any(kw in q for kw in HUMAN_KEYWORDS):
        return True
    if '?' in q and any(w in q for w in ('למה', 'מתי', 'איך', 'מי')) and len(q) > 40:
        return False
    return any(
        phrase in q
        for phrase in (
            'אפשר לעזור לי',
            'תעזרו לי',
            'צריך עזרה',
            'רוצה לדבר',
            'רוצה נציג',
        )
    )


def _format_transcript(history: list[dict]) -> str:
    lines: list[str] = []
    for item in history[-8:]:
        role = item.get('role') or 'user'
        text = (item.get('text') or '').strip()
        if not text:
            continue
        prefix = 'לקוח' if role == 'user' else 'בוט'
        lines.append(f'{prefix}: {text}')
    return '\n'.join(lines)


def _client_label(user, guest_name: str) -> str:
    if user and user.is_authenticated:
        parts = [user.display_name or user.full_name or user.email]
        if user.email:
            parts.append(user.email)
        if user.phone:
            parts.append(user.phone)
        return ' · '.join(dict.fromkeys(p for p in parts if p))
    return guest_name or 'אורח (לא מחובר)'


def notify_staff_chat_request(
    *,
    user,
    message: str,
    history: list[dict] | None = None,
    guest_name: str = '',
    page_path: str = '',
    ip_address: str | None = None,
) -> bool:
    """Create ActionLog + inbox alerts for portal staff."""
    transcript = _format_transcript(history or [])
    if message.strip():
        transcript = (transcript + f"\nלקוח: {message.strip()}").strip()

    label = _client_label(user, guest_name)
    details = (
        f'customer:{label} | page:{page_path or "-"} | '
        f'last:{message[:240]} | chat:{transcript[:900]}'
    )

    customer = user if getattr(user, 'is_authenticated', False) else None
    ActionLog.objects.create(
        customer=customer,
        event='support.chat_request',
        details=details[:2000],
        ip_address=ip_address,
    )

    body = (
        f'לקוח מבקש נציג מהצ׳אט באתר.\n\n'
        f'פרטים: {label}\n'
        f'דף: {page_path or "—"}\n\n'
        f'הודעה אחרונה:\n{message.strip()}\n\n'
        f'--- שיחה ---\n{transcript or "—"}'
    )
    subject = f'בקשת נציג — {label[:60]}'

    staff_qs = User.objects.filter(is_active=True, is_staff=True)
    notified = 0
    for staff_user in staff_qs:
        if not is_staff_portal_user(staff_user):
            continue
        send_system_message(staff_user, subject=subject, body=body[:3500])
        notified += 1

    if notified == 0:
        admin_email = getattr(settings, 'ADMIN_EMAIL', '') or ''
        admin_user = User.objects.filter(email__iexact=admin_email).first() if admin_email else None
        if admin_user:
            send_system_message(admin_user, subject=subject, body=body[:3500])
            notified = 1

    return notified > 0
