"""Send lotto order summary to external print server (POST /print)."""
import logging
import os

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class PrintError(Exception):
    pass


def _print_url() -> str:
    base = (
        getattr(settings, 'PRINT_SERVER_URL', '')
        or os.getenv('PRINT_SERVER_URL', '')
    ).strip().rstrip('/')
    if not base:
        raise PrintError('PRINT_SERVER_URL לא מוגדר ב-Backend')
    return f'{base}/print'


def _print_api_key() -> str:
    key = (
        getattr(settings, 'PRINT_API_KEY', '')
        or os.getenv('PRINT_API_KEY', '')
    ).strip()
    if not key:
        raise PrintError('PRINT_API_KEY לא מוגדר ב-Backend')
    return key


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


def build_print_payload(order) -> dict:
    customer = order.customer
    return {
        'id': order.id,
        'name': customer.display_name if hasattr(customer, 'display_name') else customer.email,
        'phone': customer.phone or '',
        'forms': build_print_forms(order.sets_json or []),
    }


def send_order_to_printer(order) -> dict:
    """POST print job to ngrok print server."""
    url = _print_url()
    payload = build_print_payload(order)
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {_print_api_key()}',
        'ngrok-skip-browser-warning': 'true',
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as exc:
        logger.exception('Print server request failed')
        raise PrintError('שרת ההדפסה לא זמין') from exc

    if res.status_code >= 400:
        logger.error('Print server %s: %s', res.status_code, res.text[:500])
        raise PrintError(f'הדפסה נכשלה (HTTP {res.status_code})')

    logger.info('Print job sent order=%s id=%s', order.order_number, order.id)
    try:
        return res.json()
    except ValueError:
        return {'ok': True, 'raw': res.text[:200]}
