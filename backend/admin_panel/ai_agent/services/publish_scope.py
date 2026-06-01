"""איזה קבצים משפיעים על האתר החי מול דשבורד הניהול."""
from __future__ import annotations

UNUSED_TEMPLATE_PATHS = frozenset({
    'templates/portal/home.html',
    'backend/templates/portal/home.html',
})

LIVE_SITE_PREFIXES = (
    'templates/web/',
    'static/css/public_site.css',
    'static/js/public_site.js',
    'frontend/app/',
    'frontend/components/',
    'frontend/lib/',
    'frontend/hooks/',
)
MANAGE_PREFIXES = (
    'templates/portal/',
    'static/css/portal',
    'static/portal/',
    'backend/templates/portal/',
    'backend/static/portal/',
)


def classify_publish_scope(files: list[str]) -> str:
    paths = [p.replace('\\', '/') for p in (files or []) if p]
    if not paths:
        return 'unknown'
    live = any(p.startswith(LIVE_SITE_PREFIXES) for p in paths)
    manage = any(
        p.startswith(MANAGE_PREFIXES) or p in UNUSED_TEMPLATE_PATHS
        for p in paths
    )
    if live and manage:
        return 'mixed'
    if live:
        return 'live'
    if manage:
        return 'manage'
    return 'unknown'


def scope_label(scope: str) -> str:
    return {
        'live': 'אתר ראשי (Next.js)',
        'manage': 'דשבורד ניהול בלבד',
        'mixed': 'אתר + ניהול',
        'unknown': 'לא ידוע',
    }.get(scope, scope)


def scope_warning(scope: str, files: list[str]) -> str | None:
    unused = [p for p in (files or []) if p.replace('\\', '/') in UNUSED_TEMPLATE_PATHS]
    if unused:
        return (
            f'הקבצים {", ".join(unused)} אינם מחוברים לאתר – '
            'השינוי לא יופיע ב-/ (אתר). ערוך frontend/app/ או backend/templates/portal/.'
        )
    if scope == 'manage':
        return (
            'השינוי משפיע על דשבורד הניהול (/manage/) בלבד. '
            'האתר הראשי ב-/ הוא Next.js – לשינוי שם צריך frontend/app/ או frontend/components/.'
        )
    return None
