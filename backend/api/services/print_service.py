"""
Send order to external print server.

Railway / .env (מומלץ — כתובת POST מלאה)::

    PRINT_SERVER_URL=https://....ngrok-free.dev/print
    PRINT_API_KEY=...
    PRINT_API_KEY_HEADER=x-api-key

Equivalent to::

    requests.post(
        os.environ['PRINT_SERVER_URL'],
        headers={'x-api-key': os.environ['PRINT_API_KEY']},
        json=payload,
    )

Payload (ברירת מחדל, לפי אדם — ``PRINT_PAYLOAD_MODE=forms``)::

    id, name, phone, forms[] → tables[] → number, numbers, strong

Optional ``PRINT_PAYLOAD_MODE=pdf_url`` → ``{"pdf_url": "..."}`` (מחייב icount_pdf_link).
"""
import logging
import os

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class PrintError(Exception):
    pass


def _print_path() -> str:
    path = (
        getattr(settings, 'PRINT_PATH', '')
        or os.getenv('PRINT_PATH', '/print')
    ).strip()
    if not path.startswith('/'):
        path = f'/{path}'
    return path.rstrip('/') or '/print'


def _print_url() -> str:
    """Full POST URL — either PRINT_SERVER_URL as-is or base + PRINT_PATH."""
    raw = (
        getattr(settings, 'PRINT_SERVER_URL', '')
        or os.getenv('PRINT_SERVER_URL', '')
    ).strip()
    if not raw:
        raise PrintError('PRINT_SERVER_URL לא מוגדר ב-Backend')
    base = raw.rstrip('/')
    path = _print_path()
    if base.endswith(path):
        return base
    return f'{base}{path}'


def _print_api_key() -> str:
    key = (
        getattr(settings, 'PRINT_API_KEY', '')
        or os.getenv('PRINT_API_KEY', '')
    ).strip()
    if not key:
        raise PrintError('PRINT_API_KEY לא מוגדר ב-Backend')
    return key


def _print_api_key_header() -> str:
    """Print server expects ``x-api-key`` (not Bearer). Override via PRINT_API_KEY_HEADER."""
    name = (
        getattr(settings, 'PRINT_API_KEY_HEADER', '')
        or os.getenv('PRINT_API_KEY_HEADER', 'x-api-key')
    ).strip()
    return name or 'x-api-key'


def _print_headers() -> dict:
    """Only x-api-key (+ ngrok hint); ``json=`` adds Content-Type."""
    return {
        _print_api_key_header(): _print_api_key(),
        'ngrok-skip-browser-warning': 'true',
    }


def _print_payload_mode() -> str:
    return (
        getattr(settings, 'PRINT_PAYLOAD_MODE', '')
        or os.getenv('PRINT_PAYLOAD_MODE', 'forms')
    ).strip().lower() or 'forms'


def print_configured() -> bool:
    try:
        _print_url()
        _print_api_key()
        return True
    except PrintError:
        return False


def build_print_forms(sets_json: list) -> list[dict]:
    """Group tables into PAIS forms (up to 14 tables per form)."""
    if not sets_json:
        return [{'tables': []}]

    sorted_sets = sorted(sets_json, key=lambda s: s.get('set_index', 0))
    forms = []
    for i in range(0, len(sorted_sets), 14):
        chunk = sorted_sets[i : i + 14]
        tables = []
        for idx, s in enumerate(chunk):
            nums = s.get('nums') or []
            if len(nums) != 6:
                nums = [
                    s.get('n1'), s.get('n2'), s.get('n3'),
                    s.get('n4'), s.get('n5'), s.get('n6'),
                ]
            tables.append({
                'number': int(s.get('set_index') or idx + 1),
                'numbers': [int(n) for n in nums if n is not None],
                'strong': int(s.get('strong') or 0),
            })
        forms.append({'tables': tables})
    return forms


def build_print_forms_from_tables(tables: list) -> list[dict]:
    """From [{number, numbers, strong}, ...] — same shape the print server expects."""
    if not tables:
        return [{'tables': []}]
    sorted_tables = sorted(tables, key=lambda t: int(t.get('number', 0)))
    forms = []
    for i in range(0, len(sorted_tables), 14):
        chunk = sorted_tables[i : i + 14]
        forms.append({
            'tables': [
                {
                    'number': int(t.get('number') or idx + 1),
                    'numbers': [int(n) for n in (t.get('numbers') or [])],
                    'strong': int(t.get('strong') or 0),
                }
                for idx, t in enumerate(chunk)
            ],
        })
    return forms


def build_forms_payload_for_user(user, *, order_id: int, tables: list) -> dict:
    return {
        'id': int(order_id or 0),
        'name': user.display_name if hasattr(user, 'display_name') else user.email,
        'phone': getattr(user, 'phone', None) or '',
        'forms': build_print_forms_from_tables(tables),
    }


def build_forms_print_payload(order) -> dict:
    customer = order.customer
    return {
        'id': order.id,
        'name': customer.display_name if hasattr(customer, 'display_name') else customer.email,
        'phone': customer.phone or '',
        'forms': build_print_forms(order.sets_json or []),
    }


def build_print_payload(order) -> dict:
    mode = _print_payload_mode()
    if mode in ('pdf', 'pdf_url'):
        pdf_url = (getattr(order, 'icount_pdf_link', None) or '').strip()
        if not pdf_url:
            raise PrintError(
                'מצב pdf_url דורש קישור PDF (הנפק חשבונית לפני הדפסה) או החלף ל-PRINT_PAYLOAD_MODE=forms'
            )
        return {'pdf_url': pdf_url}
    if mode not in ('forms', 'lotto', 'summary', ''):
        raise PrintError(f'PRINT_PAYLOAD_MODE לא מוכר: {mode}')
    return build_forms_print_payload(order)


def send_print_payload(payload: dict) -> dict:
    url = _print_url()
    try:
        res = requests.post(
            url,
            headers=_print_headers(),
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        logger.exception('Print server request failed')
        raise PrintError('שרת ההדפסה לא זמין') from exc

    if res.status_code >= 400:
        logger.error('Print server %s %s: %s', res.status_code, url, res.text[:500])
        if res.status_code == 404:
            body_lower = res.text[:2000].lower()
            if 'ngrok' in body_lower and (
                'offline' in body_lower or 'err_ngrok' in body_lower
            ):
                raise PrintError(
                    'הדפסה נכשלה — מנהרת ngrok כבויה. אדם צריך להפעיל שרת המדפסת + ngrok '
                    '(אותו URL או לעדכן PRINT_SERVER_URL ב-Railway).'
                )
            raise PrintError(
                'הדפסה נכשלה (HTTP 404) — הנתיב לא נמצא. '
                f'בדוק PRINT_SERVER_URL וש-ngrok/שרת ההדפסה רצים. ניסיון: POST {url}'
            )
        raise PrintError(f'הדפסה נכשלה (HTTP {res.status_code})')

    logger.info('Print job sent id=%s', payload.get('id'))
    try:
        return res.json()
    except ValueError:
        return {'ok': True, 'raw': res.text[:200]}


def send_order_to_printer(order) -> dict:
    return send_print_payload(build_print_payload(order))


def normalize_print_tables(raw_tables) -> list[dict]:
    """Validate tables from lotto UI before POST to print server."""
    if not isinstance(raw_tables, list):
        return []
    out = []
    for item in raw_tables:
        if not isinstance(item, dict):
            continue
        try:
            numbers = [int(n) for n in (item.get('numbers') or [])]
            strong = int(item.get('strong'))
            number = int(item.get('number'))
        except (TypeError, ValueError):
            continue
        if len(numbers) != 6 or len(set(numbers)) != 6:
            continue
        if not all(1 <= n <= 37 for n in numbers):
            continue
        if not (1 <= strong <= 7):
            continue
        out.append({'number': number, 'numbers': sorted(numbers), 'strong': strong})
    return out
