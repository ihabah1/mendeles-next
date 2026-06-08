"""מקרא דפים — 2 אותיות באנגלית + מספר (קבוע לכל דף)."""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class PageCodeEntry:
    code: str
    label_he: str
    files: tuple[str, ...]
    django_url_names: tuple[str, ...] = ()
    frontend_paths: tuple[str, ...] = ()


# אתר ציבורי (Next.js)
_PUBLIC: list[PageCodeEntry] = [
    PageCodeEntry('HO47', 'דף ראשי', ('frontend/app/page.tsx',), frontend_paths=('/',)),
    PageCodeEntry('LT83', 'לוטו', ('frontend/app/(site)/lotto/page.tsx',), frontend_paths=('/lotto',)),
    PageCodeEntry('TT29', 'טוטו', ('frontend/app/(site)/toto/page.tsx',), frontend_paths=('/toto',)),
    PageCodeEntry('AB16', 'אודות', ('frontend/app/(site)/about/page.tsx',), frontend_paths=('/about',)),
    PageCodeEntry('TE52', 'תנאי שימוש', ('frontend/app/(site)/terms/page.tsx',), frontend_paths=('/terms',)),
    PageCodeEntry('AC12', 'נגישות', ('frontend/app/(site)/accessibility/page.tsx',), frontend_paths=('/accessibility',)),
    PageCodeEntry('AU91', 'כניסה / הרשמה', ('frontend/app/(site)/auth/page.tsx',), frontend_paths=('/auth',)),
    PageCodeEntry('AO38', 'OAuth', ('frontend/app/(site)/auth/oauth/page.tsx',), frontend_paths=('/auth/oauth',)),
    PageCodeEntry('PR64', 'פרופיל', ('frontend/app/(site)/profile/page.tsx',), frontend_paths=('/profile',)),
    PageCodeEntry('TU77', 'טעינת ארנק', ('frontend/app/(site)/topup/page.tsx',), frontend_paths=('/topup',)),
    PageCodeEntry('RP45', 'איפוס סיסמה', ('frontend/app/(site)/reset-password/page.tsx',), frontend_paths=('/reset-password',)),
    PageCodeEntry('AD33', 'ניהול Next.js', ('frontend/app/(site)/admin/page.tsx',), frontend_paths=('/admin',)),
    PageCodeEntry('PM41', 'מתן הרשאות', ('frontend/app/(site)/admin/permissions/page.tsx',), frontend_paths=('/admin/permissions',)),
    PageCodeEntry('AS88', 'שירותים (staff)', ('frontend/app/(site)/admin/services/page.tsx',), frontend_paths=('/admin/services',)),
    PageCodeEntry('NV52', 'סרגל עליון', ('frontend/components/Nav.tsx',), frontend_paths=()),
]

# דשבורד Django (/manage/)
_MANAGE: list[PageCodeEntry] = [
    PageCodeEntry('CU21', 'לקוחות', ('backend/templates/portal/customers.html',), django_url_names=('customers',)),
    PageCodeEntry('CN56', 'לקוח חדש', ('backend/templates/portal/user_form.html',), django_url_names=('user_create',)),
    PageCodeEntry('CD74', 'פרטי לקוח', ('backend/templates/portal/customer_detail.html',), django_url_names=('customer_detail',)),
    PageCodeEntry('OR39', 'הזמנות', ('backend/templates/portal/orders.html',), django_url_names=('orders',)),
    PageCodeEntry('LO62', 'לוגים', ('backend/templates/portal/logs.html',), django_url_names=('logs',)),
    PageCodeEntry('AI14', 'ניהול AI', ('backend/templates/portal/ai_requests.html', 'backend/static/portal/ai-dashboard.js'), django_url_names=('ai_requests',)),
    PageCodeEntry('AJ27', 'תור AI', ('backend/templates/portal/ai_jobs.html',), django_url_names=('ai_jobs',)),
    PageCodeEntry('AN83', 'בקשת AI חדשה', ('backend/templates/portal/ai_request_form.html',), django_url_names=('ai_request_create',)),
    PageCodeEntry('AX47', 'פרטי בקשת AI', ('backend/templates/portal/ai_request_detail.html',), django_url_names=('ai_request_detail',)),
    PageCodeEntry('LI04', 'כניסה לניהול', ('backend/templates/portal/login.html',), django_url_names=('login',)),
    PageCodeEntry('BS91', 'מסגרת דשבורד', ('backend/templates/portal/base.html', 'backend/static/portal/dashboard.css'), django_url_names=()),
]

ALL_ENTRIES: tuple[PageCodeEntry, ...] = tuple(_PUBLIC + _MANAGE)
BY_CODE: dict[str, PageCodeEntry] = {e.code: e for e in ALL_ENTRIES}
_CODE_IN_TEXT = re.compile(r'\b([A-Z]{2}\d{2,4})\b')


def entry_for_code(code: str) -> PageCodeEntry | None:
    return BY_CODE.get((code or '').strip().upper())


def codes_in_prompt(text: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for m in _CODE_IN_TEXT.finditer(text or ''):
        c = m.group(1).upper()
        if c in BY_CODE and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def resolve_for_django_url(url_name: str | None) -> PageCodeEntry | None:
    if not url_name:
        return None
    for entry in ALL_ENTRIES:
        if url_name in entry.django_url_names:
            return entry
    return None


def resolve_for_frontend_path(path: str) -> PageCodeEntry | None:
    p = (path or '/').split('?')[0].rstrip('/') or '/'
    best: PageCodeEntry | None = None
    best_len = -1
    for entry in ALL_ENTRIES:
        for prefix in entry.frontend_paths:
            norm = prefix.rstrip('/') or '/'
            if p == norm or (norm != '/' and p.startswith(norm + '/')):
                if len(norm) > best_len:
                    best = entry
                    best_len = len(norm)
    return best


def format_registry_table() -> str:
    lines = [
        'מקרא דפים (ציין קוד בבקשה, למשל HO47):',
        '',
        '## אתר ציבורי',
    ]
    for e in _PUBLIC:
        paths = ', '.join(e.frontend_paths) or '—'
        lines.append(f'  {e.code}  {e.label_he}  ({paths})')
    lines.append('')
    lines.append('## דשבורד ניהול')
    for e in _MANAGE:
        if e.django_url_names:
            lines.append(f'  {e.code}  {e.label_he}')
        elif e.code == 'BS91':
            lines.append(f'  {e.code}  {e.label_he}  (sidebar / layout)')
    return '\n'.join(lines)
