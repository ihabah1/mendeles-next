"""Fetch Lotto draw results from pais.co.il and persist to draw_results.json."""
import json
import re
import ssl
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

from django.conf import settings

RANK_KEYS = ['6+strong', '6', '5+strong', '5', '4+strong', '4', '3+strong', '3']
RANK_NAMES = ['6 + חזק', '6', '5 + חזק', '5', '4 + חזק', '4', '3 + חזק', '3']

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE


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


def _fetch(url: str) -> str:
    req = Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Language': 'he-IL,he;q=0.9',
        },
    )
    return urlopen(req, context=_SSL_CTX, timeout=20).read().decode('utf-8', errors='replace')


def _resolve_lottery_id(lottery_id: int | str | None) -> str:
    if lottery_id:
        return str(lottery_id)
    archive = _fetch('https://www.pais.co.il/lotto/archive.aspx')
    ids = re.findall(r'lotteryId=(\d+)', archive)
    if not ids:
        raise ValueError('לא נמצאו הגרלות בארכיון פיס')
    return str(max(int(x) for x in ids))


def fetch_and_save_draw(lottery_id: int | str | None = None) -> dict:
    """Scrape PAIS and write draw_results.json. Returns the saved payload."""
    resolved_id = _resolve_lottery_id(lottery_id)
    html = _fetch(f'https://www.pais.co.il/Lotto/CurrentLotto.aspx?lotteryId={resolved_id}')

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

    result = {
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
