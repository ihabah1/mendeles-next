"""Fetch Lotto draw results from pais.co.il and persist to draw_results.json."""
import json
import logging
import os
import re
import ssl
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
import urllib3
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

RANK_KEYS = ['6+strong', '6', '5+strong', '5', '4+strong', '4', '3+strong', '3']
RANK_NAMES = ['6 + חזק', '6', '5 + חזק', '5', '4 + חזק', '4', '3 + חזק', '3']

# מפעל הפיס — שלישי ושבת, ~22:45 שעון ישראל
DRAW_WEEKDAYS = (1, 5)  # Tuesday, Saturday
DRAW_HOUR = 22
DRAW_MINUTE = 45
IL_TZ = ZoneInfo('Asia/Jerusalem')

PAIS_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'he-IL,he;q=0.9',
    'Accept': 'text/html,application/xhtml+xml',
    'Referer': 'https://www.pais.co.il/lotto/',
}
PAIS_CONNECT_TIMEOUT = int(os.getenv('PAIS_CONNECT_TIMEOUT', '12'))
PAIS_READ_TIMEOUT = int(os.getenv('PAIS_READ_TIMEOUT', '45'))
PAIS_TIMEOUT = (PAIS_CONNECT_TIMEOUT, PAIS_READ_TIMEOUT)
PAIS_PROXY_TIMEOUT = (
    int(os.getenv('PAIS_PROXY_CONNECT_TIMEOUT', '10')),
    int(os.getenv('PAIS_PROXY_READ_TIMEOUT', '90')),
)

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_pais_http: requests.Session | None = None


def draw_results_path() -> Path:
    for candidate in (
        Path(settings.BASE_DIR) / 'draw_results.json',
        Path(settings.BASE_DIR).parent / 'draw_results.json',
        Path(settings.BASE_DIR).parent / 'frontend' / 'draw_results.json',
    ):
        parent = candidate.parent
        if parent.exists():
            return candidate
    return Path(settings.BASE_DIR) / 'draw_results.json'


def _get_pais_session() -> requests.Session:
    global _pais_http
    if _pais_http is None:
        session = requests.Session()
        session.verify = False
        session.headers.update(PAIS_HEADERS)
        retry = Retry(
            total=2,
            connect=2,
            read=2,
            backoff_factor=0.8,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=('GET',),
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('https://', adapter)
        _pais_http = session
    return _pais_http


def _fetch(url: str) -> str:
    """Fetch PAIS HTML via requests (no urllib — avoids opaque urlopen timeouts)."""
    resp = _get_pais_session().get(url, timeout=PAIS_TIMEOUT)
    resp.raise_for_status()
    return resp.text


def _frontend_url() -> str:
    return getattr(settings, 'FRONTEND_URL', '').strip().rstrip('/')


def _cached_lottery_id() -> int | str | None:
    cached = read_draw_data() or {}
    return (cached.get('last_draw') or {}).get('lottery_id')


def _cached_draw_is_usable(cached: dict) -> bool:
    last_draw = cached.get('last_draw') or {}
    numbers = last_draw.get('numbers') or []
    return len(numbers) == 6 and bool(last_draw.get('lottery_id'))


def _fetch_via_frontend_api(lottery_id: int | str | None = None) -> dict:
    """Scrape via Next.js /api/pais when direct PAIS fetch is blocked on the host."""
    base = _frontend_url()
    if not base:
        raise ValueError('FRONTEND_URL לא מוגדר — לא ניתן להשתמש בפרוקסי')

    resolved_id = lottery_id or _cached_lottery_id()
    url = f'{base}/api/pais'
    if resolved_id:
        url = f'{url}?id={resolved_id}'

    resp = requests.get(
        url,
        timeout=PAIS_PROXY_TIMEOUT,
        headers={'Accept': 'application/json'},
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get('error'):
        raise ValueError(str(data['error']))

    numbers = data.get('numbers') or []
    if len(numbers) != 6:
        raise ValueError(f'נמצאו {len(numbers)} מספרים (צריך 6)')

    prizes_in = data.get('prizes') or {}
    return {
        'last_draw': {
            'date': data.get('date') or datetime.now().strftime('%Y-%m-%d'),
            'numbers': numbers,
            'strong': int(data.get('strong') or 0),
            'lottery_id': int(data.get('lottery_id') or resolved_id or 0),
        },
        'prizes': {
            key: {
                'name': (prizes_in.get(key) or {}).get('name') or RANK_NAMES[i],
                'ils': int((prizes_in.get(key) or {}).get('ils') or 0),
                'winners': int((prizes_in.get(key) or {}).get('winners') or 0),
            }
            for i, key in enumerate(RANK_KEYS)
        },
        'updated_at': datetime.now().isoformat(),
    }


def _resolve_lottery_id(lottery_id: int | str | None) -> str:
    if lottery_id:
        return str(lottery_id)

    cached_id = _cached_lottery_id()
    if cached_id:
        logger.info('Using cached lottery_id=%s (skip archive fetch)', cached_id)
        return str(cached_id)

    archive = _fetch('https://www.pais.co.il/lotto/archive.aspx')
    ids = re.findall(r'(?i)lotteryId=(\d+)', archive)
    if not ids:
        ids = re.findall(r'(?i)CurrentLotto\.aspx\?[^"\']*?(\d{3,6})', archive)
    if not ids:
        raise ValueError('לא נמצאו הגרלות בארכיון פיס')
    return str(max(int(x) for x in ids))


def _parse_draw_html(html: str, resolved_id: str) -> dict:
    date_m = re.search(r'(\d{2})/(\d{2})/(\d{4})', html)
    date = (
        f'{date_m.group(3)}-{date_m.group(2)}-{date_m.group(1)}'
        if date_m
        else datetime.now().strftime('%Y-%m-%d')
    )

    nums_section = re.search(r'aria-label="המספרים שעלו בגורל"([\s\S]{0,3000}?)</ol>', html)
    numbers = [
        int(m)
        for m in re.findall(
            r'class="loto_info_num">\s*<div[^>]*>(\d{1,2})</div>',
            nums_section.group(1) if nums_section else '',
        )
    ]

    strong_m = re.search(r'aria-label="המספר החזק (\d{1,2})"', html)
    strong = int(strong_m.group(1)) if strong_m else 0

    prizes_section = re.search(r'id="regularLottoList"([\s\S]{0,10000}?)</ol>', html)
    if prizes_section:
        winners = [
            int(m.replace(',', ''))
            for m in re.findall(r'aria-label="מספר זוכים ([\d,]+)"', prizes_section.group(1))
        ]
        amounts = [
            int(m.replace(',', ''))
            for m in re.findall(r'aria-label="סכום זכייה ([\d,]+)\s*₪"', prizes_section.group(1))
        ]
    else:
        winners, amounts = [], []

    if len(numbers) != 6:
        raise ValueError(f'נמצאו {len(numbers)} מספרים (צריך 6)')

    return {
        'last_draw': {
            'date': date,
            'numbers': numbers,
            'strong': strong,
            'lottery_id': int(resolved_id),
        },
        'prizes': {
            key: {
                'name': RANK_NAMES[i],
                'ils': amounts[i] if i < len(amounts) else 0,
                'winners': winners[i] if i < len(winners) else 0,
            }
            for i, key in enumerate(RANK_KEYS)
        },
        'updated_at': datetime.now().isoformat(),
    }


def _scrape_pais_direct(lottery_id: int | str | None = None) -> dict:
    resolved_id = _resolve_lottery_id(lottery_id)
    html = _fetch(f'https://www.pais.co.il/Lotto/CurrentLotto.aspx?lotteryId={resolved_id}')
    return _parse_draw_html(html, resolved_id)


def fetch_and_save_draw(lottery_id: int | str | None = None) -> dict:
    """Scrape PAIS and write draw_results.json. Returns the saved payload."""
    errors: list[str] = []
    result: dict | None = None
    source = ''

    resolved_id = lottery_id or _cached_lottery_id()

    if _frontend_url():
        try:
            result = _fetch_via_frontend_api(resolved_id)
            source = 'פרוקסי'
            logger.info('PAIS draw fetched via frontend proxy')
        except Exception as exc:
            errors.append(f'פרוקסי: {exc}')
            logger.warning('Frontend PAIS proxy failed: %s', exc)

    if result is None:
        try:
            result = _scrape_pais_direct(resolved_id)
            source = 'ישיר'
            logger.info('PAIS draw fetched via direct scrape')
        except Exception as exc:
            errors.append(f'ישיר: {exc}')
            logger.warning('Direct PAIS scrape failed: %s', exc)

    if result is None:
        cached = read_draw_data()
        if cached and _cached_draw_is_usable(cached):
            result = cached
            source = 'מטמון'
            logger.warning(
                'PAIS fetch failed; continuing with cached draw_results.json: %s',
                ' · '.join(errors),
            )
        else:
            raise RuntimeError(' · '.join(errors) or 'PAIS fetch failed')

    if source != 'מטמון':
        out = draw_results_path()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    return result


def read_draw_data() -> dict | None:
    path = draw_results_path()
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return None


def next_draw_datetime(*, after: datetime | None = None) -> datetime:
    """Next PAIS Lotto draw (Tue/Sat 22:45 Israel)."""
    now = (after or datetime.now(IL_TZ)).astimezone(IL_TZ)
    probe = now.replace(hour=DRAW_HOUR, minute=DRAW_MINUTE, second=0, microsecond=0)
    if probe <= now:
        probe += timedelta(days=1)
        probe = probe.replace(hour=DRAW_HOUR, minute=DRAW_MINUTE, second=0, microsecond=0)
    for _ in range(14):
        if probe.weekday() in DRAW_WEEKDAYS:
            return probe
        probe += timedelta(days=1)
        probe = probe.replace(hour=DRAW_HOUR, minute=DRAW_MINUTE, second=0, microsecond=0)
    return probe


def next_draw_payload() -> dict:
    target = next_draw_datetime()
    return {
        'at': target.isoformat(),
        'label': 'שלישי ושבת · 22:45',
        'weekdayHe': {0: 'שני', 1: 'שלישי', 2: 'רביעי', 3: 'חמישי', 4: 'שישי', 5: 'שבת', 6: 'ראשון'}.get(
            target.weekday(), '',
        ),
    }
