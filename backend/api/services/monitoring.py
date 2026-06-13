"""Infrastructure monitoring payload for admin dashboard."""
import os
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

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

IL_TZ = ZoneInfo('Asia/Jerusalem')
CRON_SCHEDULE = '0 5 * * *'  # UTC — matches railway.cron.toml
CRON_COMMAND = 'bash scripts/cron_daily.sh'
JOB_LABELS = {
    AutomationLog.Job.DAILY_SYNC: 'סנכרון יומי',
    AutomationLog.Job.DRAW_REFRESH: 'עדכון הגרלה',
    AutomationLog.Job.COMBO_EXPORT: 'ייצוא סטטיסטיקות',
}


def _file_size_mb(path: Path) -> float | None:
    try:
        if path.is_file():
            return round(path.stat().st_size / (1024 * 1024), 2)
    except OSError:
        pass
    return None


def _file_info(path: Path, label: str) -> dict:
    exists = path.exists()
    size = _file_size_mb(path) if exists else None
    updated_at = None
    row_count = None
    if exists:
        try:
            updated_at = datetime.fromtimestamp(path.stat().st_mtime, tz=IL_TZ).isoformat()
        except OSError:
            pass
        if path.suffix.lower() == '.csv':
            try:
                with path.open(encoding='utf-8') as f:
                    row_count = max(0, sum(1 for _ in f) - 1)
            except OSError:
                row_count = None
    return {
        'name': label,
        'path': str(path),
        'exists': exists,
        'sizeMb': size,
        'updatedAt': updated_at,
        'rowCount': row_count,
    }


def _tracked_files() -> list[dict]:
    base = Path(settings.BASE_DIR)
    data_dir = base / 'data'
    candidates = [
        ('draw_results.json', draw_results_path()),
        ('combo_pool_daily.csv', data_dir / 'combo_pool_daily.csv'),
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
        rows.append(_file_info(path, label))
    return rows


def _next_cron_run_utc() -> datetime:
    """Next 05:00 UTC daily run."""
    now_utc = timezone.now().astimezone(timezone.utc)
    candidate = datetime.combine(now_utc.date(), time(5, 0), tzinfo=timezone.utc)
    if candidate <= now_utc:
        candidate += timedelta(days=1)
    return candidate


def _next_lotto_draw() -> dict:
    """Israeli Lotto — Tuesday & Saturday ~22:30."""
    now = timezone.now().astimezone(IL_TZ)
    draw_time = time(22, 30)
    for offset in range(0, 10):
        day = now.date() + timedelta(days=offset)
        if day.weekday() not in (1, 5):
            continue
        draw_dt = datetime.combine(day, draw_time, tzinfo=IL_TZ)
        if draw_dt > now:
            return {
                'date': day.isoformat(),
                'time': '22:30',
                'dayName': 'שלישי' if day.weekday() == 1 else 'שבת',
                'at': draw_dt.isoformat(),
            }
    return {'date': None, 'time': '22:30', 'dayName': None, 'at': None}


def _draw_snapshot(draw: dict | None) -> dict:
    last = (draw or {}).get('last_draw') or {}
    prizes = (draw or {}).get('prizes') or {}
    top_prize = prizes.get('6+strong') or {}
    jackpot = top_prize.get('ils') or 0
    return {
        'lotteryId': last.get('lottery_id'),
        'date': last.get('date'),
        'numbers': last.get('numbers') or [],
        'strong': last.get('strong'),
        'updatedAt': (draw or {}).get('updated_at'),
        'jackpotIls': jackpot,
        'jackpotWinners': top_prize.get('winners', 0),
        'prizes': {
            key: {
                'name': (val or {}).get('name', key),
                'ils': (val or {}).get('ils', 0),
                'winners': (val or {}).get('winners', 0),
            }
            for key, val in prizes.items()
        },
        'nextDraw': _next_lotto_draw(),
        'sourceFile': str(draw_results_path()),
    }


def _automation_snapshot() -> dict:
    daily_logs = list(
        AutomationLog.objects.filter(job=AutomationLog.Job.DAILY_SYNC)
        .order_by('-created_at')[:20]
    )
    last_daily = daily_logs[0] if daily_logs else None
    success_count = AutomationLog.objects.filter(
        job=AutomationLog.Job.DAILY_SYNC,
        level=AutomationLog.Level.INFO,
    ).count()
    fail_count = AutomationLog.objects.filter(
        job=AutomationLog.Job.DAILY_SYNC,
        level=AutomationLog.Level.ERROR,
    ).count()

    last_details = (last_daily.details if last_daily else {}) or {}
    combos = last_details.get('combos') or {}
    next_run_utc = _next_cron_run_utc()
    next_run_il = next_run_utc.astimezone(IL_TZ)

    csv_path = Path(settings.BASE_DIR) / 'data' / 'combo_pool_daily.csv'
    csv_info = _file_info(csv_path, 'combo_pool_daily.csv')
    draw_file = _file_info(draw_results_path(), 'draw_results.json')

    return {
        'schedule': {
            'cron': CRON_SCHEDULE,
            'cronLabel': 'כל יום 05:00 UTC (07:00 שעון ישראל בקיץ / 08:00 בחורף)',
            'command': CRON_COMMAND,
            'nextRunAt': next_run_utc.isoformat(),
            'nextRunAtLocal': next_run_il.isoformat(),
        },
        'sources': [
            {
                'key': 'draw_results',
                'label': 'קובץ תוצאות הגרלה',
                'role': 'מקור עדכון מפיס',
                **draw_file,
            },
            {
                'key': 'combo_csv',
                'label': 'יומן סטטיסטיקות יומי',
                'role': 'שורה אחת לכל ריצת סנכרון',
                **csv_info,
            },
            {
                'key': 'combo_db',
                'label': 'מאגר צירופים (PostgreSQL)',
                'role': 'מקור האמת לסטים — לא קובץ',
                'path': 'ApprovedCombo',
                'exists': True,
                'sizeMb': None,
                'updatedAt': None,
                'rowCount': ApprovedCombo.objects.count(),
            },
        ],
        'lastDailySync': {
            'at': last_daily.created_at.isoformat() if last_daily else None,
            'success': bool(last_daily and last_daily.level == AutomationLog.Level.INFO),
            'level': last_daily.level if last_daily else None,
            'message': last_daily.message if last_daily else None,
            'durationMs': last_daily.duration_ms if last_daily else None,
            'recordsWritten': 1 if last_daily and last_daily.level == AutomationLog.Level.INFO else 0,
            'csvTotalRows': csv_info.get('rowCount'),
            'combos': combos,
            'drawLotteryId': (last_details.get('draw') or {}).get('lottery_id'),
        },
        'stats': {
            'totalRuns': success_count + fail_count,
            'successCount': success_count,
            'failCount': fail_count,
        },
        'runs': [
            {
                'id': row.id,
                'at': row.created_at.isoformat(),
                'success': row.level == AutomationLog.Level.INFO,
                'level': row.level,
                'message': row.message,
                'durationMs': row.duration_ms,
                'recordsWritten': 1 if row.level == AutomationLog.Level.INFO else 0,
                'combos': (row.details or {}).get('combos') or {},
                'drawLotteryId': ((row.details or {}).get('draw') or {}).get('lottery_id'),
            }
            for row in daily_logs
        ],
        'lastRunAt': last_daily.created_at.isoformat() if last_daily else None,
        'lastStatus': last_daily.level if last_daily else None,
        'lastMessage': last_daily.message if last_daily else None,
        'logs': [
            {
                **entry,
                'jobLabel': JOB_LABELS.get(entry['job'], entry['job']),
            }
            for entry in recent_automation_logs(limit=40)
        ],
    }


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
        'draw': _draw_snapshot(draw),
        'automation': _automation_snapshot(),
        'integrations': recent_integration_logs(limit=20),
        'chatInquiriesOpen': GuideChatInquiry.objects.filter(escalated=True).count(),
    }
