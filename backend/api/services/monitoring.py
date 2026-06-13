"""Infrastructure monitoring payload for admin dashboard."""
import os
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db.models import Count, Sum
from django.utils import timezone

from admin_panel.accounts.models import User
from admin_panel.portal.models import ApprovedCombo, AutomationLog, GuideChatInquiry, Order, SiteDailyMetric

from api.services.automation_log import recent_automation_logs
from api.services.firebase_service import firebase_config_status
from api.services.icount_service import icount_config_status
from api.services.integration_log import recent_integration_logs
from api.services.pais_draw import draw_results_path, read_draw_data
from api.services.print_service import print_configured
from api.services.resend_email import resend_config_status
from api.services.sms import sms_config_status


def _file_size_mb(path: Path) -> float | None:
    try:
        if path.is_file():
            return round(path.stat().st_size / (1024 * 1024), 2)
    except OSError:
        pass
    return None


def _tracked_files() -> list[dict]:
    base = Path(settings.BASE_DIR)
    candidates = [
        ('draw_results.json', draw_results_path()),
        ('approved_combos.json', base / 'approved_combos.json'),
        ('approved_combos.json (parent)', base.parent / 'approved_combos.json'),
    ]
    seen: set[str] = set()
    rows: list[dict] = []
    for label, path in candidates:
        key = str(path.resolve()) if path.exists() else label
        if key in seen:
            continue
        seen.add(key)
        size = _file_size_mb(path) if path.exists() else None
        rows.append({
            'name': label,
            'path': str(path),
            'exists': path.exists(),
            'sizeMb': size,
        })
    return rows


def _combo_pool() -> dict:
    total = ApprovedCombo.objects.count()
    used = ApprovedCombo.objects.filter(used=True).count()
    free = ApprovedCombo.objects.filter(used=False).count()
    pct_used = round(100 * used / total, 1) if total else 0
    return {
        'total': total,
        'used': used,
        'free': free,
        'percentUsed': pct_used,
    }


def _service_status() -> list[dict]:
    gemini_key = bool((getattr(settings, 'GEMINI_API_KEY', '') or os.getenv('GEMINI_API_KEY', '')).strip())
    return [
        {'key': 'icount', 'label': 'iCount חשבוניות', **icount_config_status()},
        {'key': 'print', 'label': 'שרת הדפסה', 'configured': print_configured()},
        {'key': 'resend', 'label': 'אימייל Resend', **resend_config_status()},
        {'key': 'sms', 'label': 'SMS', **sms_config_status()},
        {'key': 'firebase', 'label': 'Firebase טלפון', **firebase_config_status()},
        {
            'key': 'gemini',
            'label': 'Google Gemini (צ׳אט)',
            'configured': gemini_key,
            'hint': None if gemini_key else 'הוסף GEMINI_API_KEY ב-Railway',
        },
        {
            'key': 'railway',
            'label': 'Railway (עלות)',
            'configured': False,
            'hint': 'צפה ב-Railway Dashboard → Usage & Billing',
        },
        {
            'key': 'storage',
            'label': 'אחסון DB / קבצים',
            'configured': True,
            'hint': 'PostgreSQL volume ב-Railway — אין API עלות מקומי',
        },
    ]


def build_monitoring_snapshot() -> dict:
    today = timezone.localdate()
    week_ago = today - timedelta(days=7)

    managed_users = User.objects.exclude(
        email__iexact=getattr(settings, 'ADMIN_EMAIL', ''),
    ).filter(role__in=[User.Role.CUSTOMER, User.Role.TEAM])

    orders_today = Order.objects.filter(created_at__date=today).count()
    revenue = Order.objects.aggregate(total=Sum('amount_ils'))['total'] or 0

    metric_today, _ = SiteDailyMetric.objects.get_or_create(date=today)
    if metric_today.orders_count != orders_today:
        metric_today.orders_count = orders_today
        metric_today.new_users = managed_users.filter(date_joined__date=today).count()
        metric_today.save(update_fields=['orders_count', 'new_users', 'updated_at'])

    daily_metrics = [
        {
            'date': m.date.isoformat(),
            'pageViews': m.page_views,
            'uniqueVisitors': m.unique_visitors,
            'orders': m.orders_count,
            'newUsers': m.new_users,
            'chatSessions': m.chat_sessions,
        }
        for m in SiteDailyMetric.objects.filter(date__gte=week_ago).order_by('-date')
    ]

    draw = read_draw_data()
    last_automation = AutomationLog.objects.order_by('-created_at').first()

    return {
        'generatedAt': timezone.now().isoformat(),
        'users': {
            'total': managed_users.count(),
            'newToday': managed_users.filter(date_joined__date=today).count(),
            'activeStaff': User.objects.filter(is_staff=True, is_active=True).count(),
        },
        'traffic': {
            'pageViewsToday': metric_today.page_views,
            'uniqueVisitorsToday': metric_today.unique_visitors,
            'ordersToday': orders_today,
            'chatSessionsToday': metric_today.chat_sessions,
            'daily': daily_metrics,
        },
        'business': {
            'totalRevenueIls': float(revenue),
            'totalOrders': Order.objects.count(),
        },
        'comboPool': _combo_pool(),
        'files': _tracked_files(),
        'services': _service_status(),
        'draw': {
            'lotteryId': (draw or {}).get('last_draw', {}).get('lottery_id'),
            'date': (draw or {}).get('last_draw', {}).get('date'),
        },
        'automation': {
            'lastRunAt': last_automation.created_at.isoformat() if last_automation else None,
            'lastStatus': last_automation.level if last_automation else None,
            'lastMessage': last_automation.message if last_automation else None,
            'logs': recent_automation_logs(limit=30),
        },
        'integrations': recent_integration_logs(limit=20),
        'chatInquiriesOpen': GuideChatInquiry.objects.filter(escalated=True).count(),
    }
