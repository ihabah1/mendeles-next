"""Runtime service flags – DB overrides with env/settings fallback."""
from __future__ import annotations

from django.conf import settings
from django.core.cache import cache

CACHE_PREFIX = 'service_flag:'
CACHE_TTL = 60

# Maps ServiceFlag.key → Django settings attribute used as boot-time default.
FLAG_SETTINGS_MAP: dict[str, str] = {
    'portal_dashboard': 'PORTAL_DASHBOARD_ENABLED',
    'ai_agent': 'AI_AGENT_ENABLED',
    'legacy_services': 'LEGACY_SERVICES_ENABLED',
    'legacy_auto_start': 'LEGACY_AUTO_START',
}

DEFAULT_FLAGS: list[dict] = [
    {
        'key': 'portal_dashboard',
        'label': 'דשבורד ניהול Django',
        'description': 'ממשק /manage — לקוחות, הזמנות, לוגים ובקשות AI',
        'requires_restart': False,
    },
    {
        'key': 'ai_agent',
        'label': 'סוכן AI',
        'description': 'שליחת בקשות שינוי ל-Gemini ויצירת PR ב-GitHub',
        'requires_restart': False,
    },
    {
        'key': 'legacy_services',
        'label': 'שירותי Flask ישנים',
        'description': 'פרוקסי לשירותי לוטו / ארנק / טוטו (Flask)',
        'requires_restart': False,
    },
    {
        'key': 'legacy_auto_start',
        'label': 'הפעלה אוטומטית Flask',
        'description': 'הפעלת שירותי legacy אוטומטית עם עליית השרת',
        'requires_restart': True,
    },
]


def _settings_default(key: str) -> bool:
    attr = FLAG_SETTINGS_MAP.get(key)
    if not attr:
        return False
    return bool(getattr(settings, attr, False))


def _cache_key(key: str) -> str:
    return f'{CACHE_PREFIX}{key}'


def invalidate_cache(key: str | None = None) -> None:
    if key:
        cache.delete(_cache_key(key))
        return
    for flag_key in FLAG_SETTINGS_MAP:
        cache.delete(_cache_key(flag_key))


def is_enabled(key: str) -> bool:
    cached = cache.get(_cache_key(key))
    if cached is not None:
        return bool(cached)

    try:
        from admin_panel.portal.models import ServiceFlag

        row = ServiceFlag.objects.filter(key=key).only('enabled').first()
        if row is not None:
            cache.set(_cache_key(key), row.enabled, CACHE_TTL)
            return row.enabled
    except Exception:
        pass

    default = _settings_default(key)
    cache.set(_cache_key(key), default, CACHE_TTL)
    return default


def ensure_default_flags() -> None:
    """Create missing flag rows seeded from current settings (post-migrate)."""
    from admin_panel.portal.models import ServiceFlag

    for spec in DEFAULT_FLAGS:
        ServiceFlag.objects.get_or_create(
            key=spec['key'],
            defaults={
                'label': spec['label'],
                'description': spec['description'],
                'requires_restart': spec['requires_restart'],
                'enabled': _settings_default(spec['key']),
            },
        )


def list_flags() -> list[dict]:
    from admin_panel.portal.models import ServiceFlag

    ensure_default_flags()
    rows = {f.key: f for f in ServiceFlag.objects.all()}
    out: list[dict] = []
    for spec in DEFAULT_FLAGS:
        row = rows.get(spec['key'])
        if not row:
            continue
        out.append({
            'key': row.key,
            'label': row.label,
            'description': row.description,
            'enabled': row.enabled,
            'requires_restart': row.requires_restart,
            'updated_at': row.updated_at.isoformat() if row.updated_at else None,
        })
    return out


def update_flags(updates: dict[str, bool]) -> list[dict]:
    from admin_panel.portal.models import ServiceFlag

    ensure_default_flags()
    for key, enabled in updates.items():
        if key not in FLAG_SETTINGS_MAP:
            continue
        ServiceFlag.objects.filter(key=key).update(enabled=bool(enabled))
        invalidate_cache(key)
    return list_flags()
