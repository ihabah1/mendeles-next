"""System inbox messages for customers."""
from admin_panel.portal.models import CustomerMessage

WELCOME_SUBJECT = 'ברוכים הבאים'


def send_system_message(user, *, subject: str, body: str) -> CustomerMessage:
    return CustomerMessage.objects.create(
        customer=user,
        channel=CustomerMessage.Channel.SYSTEM,
        subject=subject,
        body=body,
    )


def send_welcome_if_needed(user) -> CustomerMessage | None:
    """Idempotent welcome letter for new customers."""
    if CustomerMessage.objects.filter(customer=user, subject=WELCOME_SUBJECT).exists():
        return None

    name = (user.display_name or user.full_name or user.email or 'לקוח').strip()
    body = (
        f'שלום {name},\n\n'
        'תודה שנרשמת למנדלס! כאן בתיבת הדואר שלך תקבל מכתבי מערכת, '
        'עדכונים על הזמנות, זכיות ועוד.\n\n'
        'בהצלחה בהגרלות!'
    )
    return send_system_message(user, subject=WELCOME_SUBJECT, body=body)
