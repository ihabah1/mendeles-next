"""מגבלות נתיב – templates/static ב-backend ו-frontend ב-monorepo."""
from __future__ import annotations

import re
from pathlib import Path, PurePosixPath

# backend/ בלבד (BASE_DIR) או monorepo (שורש clone מ-GitHub)
ALLOWED_PREFIXES_BACKEND = ('templates/', 'static/')
ALLOWED_PREFIXES_MONOREPO = (
    'backend/templates/',
    'backend/static/',
    'frontend/app/',
    'frontend/components/',
    'frontend/lib/',
    'frontend/hooks/',
)
ALLOWED_PREFIXES = ALLOWED_PREFIXES_BACKEND + ALLOWED_PREFIXES_MONOREPO

# מיפוי נתיבים ישנים (Django-only) → monorepo
LEGACY_PATH_ALIASES: dict[str, str] = {
    'templates/portal/base_dashboard.html': 'backend/templates/portal/base.html',
    'static/css/portal.css': 'backend/static/portal/dashboard.css',
    'templates/web/base_public.html': 'frontend/components/Nav.tsx',
    'templates/web/home.html': 'frontend/app/(site)/page.tsx',
    'templates/web/lotto_home.html': 'frontend/app/(site)/lotto/page.tsx',
    'templates/web/partials/lotto_panel.html': 'frontend/app/(site)/lotto/page.tsx',
    'templates/web/partials/toto_panel.html': 'frontend/app/(site)/toto/page.tsx',
    'templates/web/about.html': 'frontend/app/(site)/about/page.tsx',
    'templates/web/legal.html': 'frontend/app/(site)/terms/page.tsx',
    'templates/web/login.html': 'frontend/app/(site)/auth/page.tsx',
    'static/css/public_site.css': 'frontend/app/globals.css',
    'static/js/public_site.js': 'frontend/lib/api/client.ts',
}

LEGACY_PREFIX_ALIASES: tuple[tuple[str, str], ...] = (
    ('templates/portal/', 'backend/templates/portal/'),
    ('templates/web/', 'frontend/app/(site)/'),
    ('static/css/portal', 'backend/static/portal/'),
    ('static/portal/', 'backend/static/portal/'),
    ('static/css/public_site', 'frontend/app/globals'),
    ('static/js/public_site', 'frontend/lib/'),
)

BLOCKED_TEMPLATE_PATHS = frozenset({
    'templates/portal/home.html',
    'backend/templates/portal/home.html',
    'templates/web/spa.html',
})

BLOCKED_PATH_PREFIXES = (
    'static/frontend/',
    'backend/static/frontend/',
)

FORBIDDEN_EXACT = frozenset({
    '.env',
    'env',
    'env.txt',
    'manage.py',
    'requirements.txt',
    'Procfile',
    'railway.toml',
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'middleware.ts',
    'prisma.config.ts',
})

FORBIDDEN_SUBSTRINGS = (
    'settings.py',
    'wsgi.py',
    'asgi.py',
    'urls.py',
    '/migrations/',
    'migrations/',
    'accounts/',
    'portal/views',
    'portal/forms',
    'portal/middleware',
    'web/auth_api',
    'payment',
    'stripe',
    'paypal',
    '.git/',
    '__pycache__',
    '.venv/',
    'node_modules/',
    '/.next/',
    '/prisma/',
    'frontend/app/api/',
    'frontend/app/django-api/',
    'app/api/webhooks/',
)

FORBIDDEN_PREFIXES = (
    'mandeles_portal/',
    'backend/mandeles_portal/',
    'admin_panel/',
    'backend/admin_panel/',
    'ai_agent/services/',
    'backend/admin_panel/ai_agent/services/',
    'ai_agent/git_tools/',
    'backend/admin_panel/ai_agent/git_tools/',
)


def is_monorepo_root(root: Path) -> bool:
    return (root / 'backend' / 'templates').is_dir() or (
        (root / 'backend').is_dir() and (root / 'frontend').is_dir()
    )


_SCAN_PREFIX_CANDIDATES = ALLOWED_PREFIXES_MONOREPO + ALLOWED_PREFIXES_BACKEND


def get_scan_prefixes(root: Path) -> tuple[str, ...]:
    """מחזיר רק תיקיות שקיימות בפועל על הדיסק (גמיש ל-monorepo ול-backend בלבד)."""
    root = Path(root)
    found = [
        prefix for prefix in _SCAN_PREFIX_CANDIDATES
        if (root / prefix.rstrip('/')).is_dir()
    ]
    return tuple(found)


def resolve_content_roots(primary: Path, fallback: Path) -> list[Path]:
    """רשימת שורשים לנסות – clone מ-GitHub, קבצי השרת, שורש monorepo."""
    roots: list[Path] = []
    seen: set[str] = set()
    for candidate in (primary, fallback, fallback.parent):
        try:
            key = str(candidate.resolve())
        except OSError:
            continue
        if key in seen or not candidate.is_dir():
            continue
        seen.add(key)
        roots.append(candidate)
    return roots


def find_allowed_files(start_root: Path, fallback: Path) -> tuple[Path, list[tuple[str, str]], list[str]]:
    """מחפש קבצים מותרים בכמה שורשים; מחזיר (root, files, log_lines)."""
    log_lines: list[str] = []
    for root in resolve_content_roots(start_root, fallback):
        files = list_allowed_files(root)
        prefixes = get_scan_prefixes(root)
        prefix_label = ', '.join(prefixes) if prefixes else '—'
        log_lines.append(f'{root} [{prefix_label}] → {len(files)} קבצים')
        if files:
            return root, files, log_lines
    return start_root, [], log_lines


def normalize_repo_path(path: str) -> str:
    p = path.strip().replace('\\', '/').lstrip('./')
    if p.startswith('a/') or p.startswith('b/'):
        p = p[2:]
    return PurePosixPath(p).as_posix()


def _alias_candidates(rel: str) -> list[str]:
    rel = normalize_repo_path(rel)
    out: list[str] = [rel]
    if rel in LEGACY_PATH_ALIASES:
        out.append(LEGACY_PATH_ALIASES[rel])
    for old_prefix, new_prefix in LEGACY_PREFIX_ALIASES:
        if rel.startswith(old_prefix):
            out.append(new_prefix + rel[len(old_prefix):])
    seen: set[str] = set()
    deduped: list[str] = []
    for item in out:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    return deduped


def resolve_file_on_disk(root: Path, rel: str) -> Path | None:
    for candidate in _alias_candidates(rel):
        path = root / candidate
        if path.is_file():
            return path
    return None


def resolve_hint_path(hint: str, root: Path) -> str:
    found = resolve_file_on_disk(root, hint)
    if found:
        return found.relative_to(root).as_posix()
    return normalize_repo_path(hint)


def is_path_allowed(path: str) -> tuple[bool, str]:
    rel = normalize_repo_path(path)
    if not rel or rel == '.':
        return False, 'נתיב ריק'
    if rel in FORBIDDEN_EXACT:
        return False, f'קובץ אסור: {rel}'
    lower = rel.lower()
    for token in FORBIDDEN_SUBSTRINGS:
        if token in lower:
            return False, f'נתיב אסור (מכיל {token}): {rel}'
    for prefix in FORBIDDEN_PREFIXES:
        if lower.startswith(prefix):
            return False, f'תיקייה אסורה: {rel}'
    if rel in BLOCKED_TEMPLATE_PATHS:
        return False, (
            f'{rel} אינו בשימוש באתר (ארכיון). '
            'לשינוי באתר הראשי: frontend/app/ או frontend/components/. '
            'לדשבורד: backend/templates/portal/ או backend/static/portal/'
        )
    for prefix in BLOCKED_PATH_PREFIXES:
        if lower.startswith(prefix):
            return False, (
                f'{rel} – React הוסר. ערוך frontend/app/ או backend/templates/portal/'
            )
    if not any(lower.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        return False, (
            f'מותר לערוך רק תחת templates/, static/, backend/templates/, '
            f'backend/static/, frontend/app/, frontend/components/: {rel}'
        )
    if '..' in rel.split('/'):
        return False, f'נתיב לא חוקי: {rel}'
    return True, ''


def extract_paths_from_diff(diff_text: str) -> list[str]:
    paths: list[str] = []
    for line in diff_text.splitlines():
        if line.startswith('+++ ') or line.startswith('--- '):
            raw = line[4:].strip()
            if raw in ('/dev/null', ''):
                continue
            if '\t' in raw:
                raw = raw.split('\t', 1)[0]
            paths.append(normalize_repo_path(raw))
    return list(dict.fromkeys(paths))


def validate_diff_paths(diff_text: str) -> None:
    paths = extract_paths_from_diff(diff_text)
    if not paths:
        raise ValueError('ה-diff לא מכיל קבצים')
    blocked = []
    for path in paths:
        ok, reason = is_path_allowed(path)
        if not ok:
            blocked.append(f'{path}: {reason}')
    if blocked:
        raise ValueError('קבצים אסורים ב-diff:\n' + '\n'.join(blocked))


def list_allowed_files(base_dir) -> list[tuple[str, str]]:
    """רשימת קבצים מותרים לקונטקסט (נתיב יחסי, תוכן מקוצר)."""
    root = Path(base_dir)
    files: list[tuple[str, str]] = []
    max_file = 48_000
    max_total = 200_000
    total = 0
    for prefix in get_scan_prefixes(root):
        folder = root / prefix.rstrip('/')
        if not folder.is_dir():
            continue
        for path in sorted(folder.rglob('*')):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            ok, _ = is_path_allowed(rel)
            if not ok:
                continue
            if path.suffix.lower() in {
                '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.svg',
            }:
                continue
            try:
                content = path.read_text(encoding='utf-8', errors='replace')
            except OSError:
                continue
            if len(content) > max_file:
                content = content[:max_file] + '\n... [truncated]'
            if total + len(content) > max_total:
                return files
            total += len(content)
            files.append((rel, content))
    return files
