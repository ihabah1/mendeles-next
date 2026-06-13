"""Persist guide chat sessions and build staff summaries."""
from django.utils import timezone

from admin_panel.portal.models import GuideChatInquiry, SiteDailyMetric


def _today_metric():
    today = timezone.localdate()
    metric, _ = SiteDailyMetric.objects.get_or_create(date=today)
    return metric


def record_site_visit(*, visitor_key: str) -> None:
    """Increment daily page view + unique visitor (visitor_key = IP or session)."""
    from django.core.cache import cache

    metric = _today_metric()
    metric.page_views += 1
    cache_key = f'site:visitor:{timezone.localdate()}:{visitor_key}'
    if not cache.get(cache_key):
        cache.set(cache_key, 1, 60 * 60 * 26)
        metric.unique_visitors += 1
    metric.save(update_fields=['page_views', 'unique_visitors', 'updated_at'])


def _build_summary(messages: list[dict], escalated: bool) -> str:
    user_msgs = [m.get('text', '').strip() for m in messages if m.get('role') == 'user']
    user_msgs = [t for t in user_msgs if t]
    if not user_msgs:
        return 'פנייה ללא טקסט'
    first = user_msgs[0][:200]
    extra = len(user_msgs) - 1
    tail = f' (+{extra} הודעות נוספות)' if extra > 0 else ''
    flag = ' · ביקש נציג' if escalated else ''
    return f'{first}{tail}{flag}'


def append_guide_message(
    *,
    session_id: str,
    user,
    guest_name: str = '',
    page_path: str = '',
    ip_address: str | None = None,
    user_message: str,
    assistant_message: str,
    escalated: bool = False,
) -> GuideChatInquiry:
    session_id = (session_id or '').strip()[:64]
    if not session_id:
        session_id = f'anon-{timezone.now().timestamp():.0f}'

    customer = user if getattr(user, 'is_authenticated', False) else None
    inquiry, created = GuideChatInquiry.objects.get_or_create(
        session_id=session_id,
        defaults={
            'customer': customer,
            'guest_name': (guest_name or '')[:120],
            'page_path': (page_path or '')[:200],
            'ip_address': ip_address,
            'messages': [],
            'escalated': escalated,
        },
    )

    if not created:
        if customer and not inquiry.customer_id:
            inquiry.customer = customer
        if guest_name and not inquiry.guest_name:
            inquiry.guest_name = guest_name[:120]
        if page_path:
            inquiry.page_path = page_path[:200]
        if escalated:
            inquiry.escalated = True

    now = timezone.now().isoformat()
    msgs = list(inquiry.messages or [])
    if user_message.strip():
        msgs.append({'role': 'user', 'text': user_message.strip(), 'at': now})
    if assistant_message.strip():
        msgs.append({'role': 'assistant', 'text': assistant_message.strip(), 'at': now})
    inquiry.messages = msgs[-40:]
    inquiry.ai_summary = _build_summary(inquiry.messages, inquiry.escalated)
    inquiry.save()

    if created:
        metric = _today_metric()
        metric.chat_sessions += 1
        metric.save(update_fields=['chat_sessions', 'updated_at'])

    return inquiry
