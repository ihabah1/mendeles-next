"""iCount API v3 — issue tax invoices for orders."""
import logging
import os
from datetime import date

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ICOUNT_DEFAULT_URL = 'https://api.icount.co.il/api/v3.php'


class ICountError(Exception):
    pass


def _api_token() -> str:
    token = (
        getattr(settings, 'ICOUNT_API_TOKEN', '')
        or os.getenv('ICOUNT_API_TOKEN', '')
    ).strip()
    if not token:
        raise ICountError('ICOUNT_API_TOKEN לא מוגדר ב-Backend')
    return token


def _api_url() -> str:
    return (
        getattr(settings, 'ICOUNT_API_URL', '')
        or os.getenv('ICOUNT_API_URL', ICOUNT_DEFAULT_URL)
    ).strip() or ICOUNT_DEFAULT_URL


def icount_configured() -> bool:
    try:
        _api_token()
        return True
    except ICountError:
        return False


def icount_config_status() -> dict:
    if not icount_configured():
        return {'configured': False, 'hint': 'הוסף ICOUNT_API_TOKEN ב-Backend'}
    return {'configured': True, 'api_url': _api_url(), 'hint': None}


def _parse_icount_response(res: requests.Response) -> dict:
    try:
        data = res.json()
    except ValueError:
        raise ICountError(f'תשובה לא תקינה מ-iCount: {res.text[:200]}') from None

    if isinstance(data, dict):
        status = data.get('status')
        if status is not None and int(status) != 0:
            err = data.get('reason') or data.get('error') or data.get('message') or data
            raise ICountError(f'iCount: {err}')
        if data.get('error'):
            raise ICountError(f'iCount: {data.get("error")}')
    return data if isinstance(data, dict) else {'raw': data}


def create_invoice_for_order(order) -> dict:
    """
    Create חשבונית מס קבלה (invrec) linked to order customer.
    Returns dict with doc_id, doc_number, pdf_link when available.
    """
    customer = order.customer
    token = _api_token()
    amount = float(order.amount_ils or 0)
    if amount <= 0:
        raise ICountError('סכום הזמנה לא תקין לחשבונית')

    description = (
        f'הזמנה {order.order_number} — לוטו '
        f'({order.forms_count} טבלאות, הגרלה {order.draw_name or ""})'
    ).strip()

    payload = {
        'api_token': token,
        'doctype': getattr(settings, 'ICOUNT_DOC_TYPE', 'invrec') or 'invrec',
        'lang': 'he',
        'currency_code': 'ILS',
        'client_name': customer.display_name or customer.email,
        'email': customer.email,
        'phone': customer.phone or '',
        'doc_date': date.today().strftime('%Y%m%d'),
        'remarks': order.order_number,
        'items[0][description]': description,
        'items[0][quantity]': 1,
        'items[0][unitprice]': amount,
        'items[0][tax_rate]': int(getattr(settings, 'ICOUNT_VAT_RATE', 18) or 18),
    }

    try:
        res = requests.post(_api_url(), data=payload, timeout=30)
    except requests.RequestException as exc:
        logger.exception('iCount request failed')
        raise ICountError('לא ניתן להתחבר ל-iCount') from exc

    if res.status_code >= 400:
        logger.error('iCount HTTP %s: %s', res.status_code, res.text[:500])
        raise ICountError(f'iCount HTTP {res.status_code}')

    data = _parse_icount_response(res)
    doc_id = data.get('doc_id') or data.get('docid') or data.get('id')
    doc_number = data.get('doc_number') or data.get('docnum') or data.get('number')
    pdf_link = data.get('pdf_link') or data.get('pdf_url') or data.get('doc_url')

    logger.info(
        'iCount invoice order=%s doc_number=%s',
        order.order_number,
        doc_number,
    )
    return {
        'doc_id': doc_id,
        'doc_number': doc_number,
        'pdf_link': pdf_link,
        'raw': data,
    }
