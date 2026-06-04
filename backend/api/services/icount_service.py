"""iCount API v3 — issue tax invoices for orders."""
import logging
import os
from datetime import date

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ICOUNT_DEFAULT_BASE = 'https://api.icount.co.il/api/v3.php'
ICOUNT_CREATE_PATH = '/doc/create'

# iCount doc/create expects string doctypes (bad_doctype if numeric-only in some accounts).
# Numeric env values (305, 320) are aliases → string API values.
DOC_TYPE_ALIASES = {
    '305': 'invrec',
    '320': 'invoice',
    '405': 'receipt',
    '400': 'refund',
    '300': 'offer',
    '100': 'delivery',
    'invrec': 'invrec',
    'invoice': 'invoice',
    'inv': 'invoice',
    'receipt': 'receipt',
    'refund': 'refund',
    'order': 'order',
    'offer': 'offer',
    'delivery': 'delivery',
    'deal': 'deal',
}

_doctypes_cache: dict[str, str] | None = None


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


def _api_base_url() -> str:
    raw = (
        getattr(settings, 'ICOUNT_API_URL', '')
        or os.getenv('ICOUNT_API_URL', ICOUNT_DEFAULT_BASE)
    ).strip() or ICOUNT_DEFAULT_BASE
    return raw.rstrip('/')


def _create_url() -> str:
    base = _api_base_url()
    if base.endswith('/doc/create'):
        return base
    return f'{base}{ICOUNT_CREATE_PATH}'


def _normalize_doctype_key(raw: str) -> str:
    key = (raw or 'invrec').strip().lower()
    return DOC_TYPE_ALIASES.get(key, key)


def fetch_available_doctypes(*, force: bool = False) -> dict[str, str]:
    """Return {doctype_code: hebrew_label} from iCount doc/types."""
    global _doctypes_cache
    if _doctypes_cache is not None and not force:
        return _doctypes_cache

    url = f'{_api_base_url()}/doc/types'
    try:
        res = requests.post(
            url,
            json=_with_company({}),
            headers=_auth_headers(),
            timeout=20,
        )
        res.raise_for_status()
        data = _parse_icount_response(res)
    except (ICountError, requests.RequestException) as exc:
        logger.warning('iCount doc/types failed: %s', exc)
        _doctypes_cache = {}
        return {}

    types_data = data.get('doctypes') or data.get('data') or data.get('types') or {}
    parsed: dict[str, str] = {}
    if isinstance(types_data, dict):
        for type_id, type_name in types_data.items():
            if type_id in ('api', 'status'):
                continue
            if isinstance(type_name, str):
                parsed[str(type_id)] = type_name
            elif isinstance(type_name, dict):
                parsed[str(type_id)] = (
                    type_name.get('name')
                    or type_name.get('doc_type_name')
                    or str(type_id)
                )
    _doctypes_cache = parsed
    return parsed


def _resolve_doctype() -> str:
    raw = (getattr(settings, 'ICOUNT_DOC_TYPE', 'invrec') or 'invrec').strip()
    normalized = _normalize_doctype_key(raw)
    available = fetch_available_doctypes()

    if not available:
        return normalized

    # Prefer exact key from account (string or numeric id)
    for candidate in (raw, normalized):
        if candidate in available:
            return candidate
        if candidate.lower() in available:
            return candidate.lower()

    # Map alias to a key that exists (e.g. invrec → 305 if account uses numeric keys)
    for candidate in (normalized, raw):
        for code, label in available.items():
            if candidate == code.lower():
                return code
            if normalized == _normalize_doctype_key(code):
                return code

    return normalized


def _bad_doctype_hint() -> str:
    available = fetch_available_doctypes(force=True)
    if available:
        sample = ', '.join(f'{k} ({v})' for k, v in list(available.items())[:6])
        return (
            f'סוג מסמך לא תקין (bad_doctype). הגדר ICOUNT_DOC_TYPE=invrec או אחד מ: {sample}'
        )
    return 'סוג מסמך לא תקין (bad_doctype). נסה ICOUNT_DOC_TYPE=invrec'


def icount_configured() -> bool:
    try:
        _api_token()
        return True
    except ICountError:
        return False


def _company_id() -> str:
    return (
        getattr(settings, 'ICOUNT_COMP_ID', '')
        or os.getenv('ICOUNT_COMP_ID', '')
    ).strip()


def _auth_headers() -> dict:
    return {
        'Authorization': f'Bearer {_api_token()}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def _with_company(body: dict) -> dict:
    """Some iCount accounts expect cid (company id) in the JSON body."""
    cid = _company_id()
    if cid:
        return {**body, 'cid': cid}
    return body


def icount_config_status() -> dict:
    if not icount_configured():
        return {
            'configured': False,
            'hint': 'הוסף ICOUNT_API_TOKEN ב-Railway → שירות Backend (eloquent-perfection)',
            'auth_mode': None,
        }
    cid = _company_id()
    doctype = _resolve_doctype()
    available = fetch_available_doctypes()
    return {
        'configured': True,
        'auth_mode': 'api_token',
        'api_url': _create_url(),
        'doctype': doctype,
        'doctype_config': (getattr(settings, 'ICOUNT_DOC_TYPE', '') or '').strip() or 'invrec',
        'available_doctypes': available,
        'company_id': cid or None,
        'hint': None,
    }


def _parse_icount_response(res: requests.Response) -> dict:
    try:
        data = res.json()
    except ValueError:
        raise ICountError(f'תשובה לא תקינה מ-iCount: {res.text[:200]}') from None

    if not isinstance(data, dict):
        return {'raw': data}

    if data.get('status') is False:
        reason = str(data.get('reason') or data.get('error') or '')
        if 'bad_doctype' in reason:
            raise ICountError(_bad_doctype_hint())
        err = data.get('message') or data.get('error') or data.get('reason') or data
        raise ICountError(f'iCount: {err}')

    status = data.get('status')
    if status is not None and status != 0 and status != '0' and status is not True:
        try:
            if int(status) != 0:
                err = data.get('reason') or data.get('error') or data.get('message') or data
                raise ICountError(f'iCount: {err}')
        except (TypeError, ValueError):
            pass

    err_field = data.get('error')
    if err_field:
        if 'bad_doctype' in str(err_field):
            raise ICountError(_bad_doctype_hint())
        raise ICountError(f'iCount: {err_field}')

    return data


def _extract_doc_fields(data: dict) -> dict:
    inner = data.get('data') if isinstance(data.get('data'), dict) else data
    doc_id = inner.get('doc_id') or inner.get('docid') or inner.get('id')
    doc_number = inner.get('doc_number') or inner.get('docnum') or inner.get('number')
    pdf_link = inner.get('pdf_link') or inner.get('pdf_url') or inner.get('doc_url')
    return {
        'doc_id': doc_id,
        'doc_number': doc_number,
        'pdf_link': pdf_link,
        'raw': data,
    }


def create_invoice_for_order(order) -> dict:
    """
    Create חשבונית מס קבלה via POST /api/v3.php/doc/create (Bearer token).
    Returns dict with doc_id, doc_number, pdf_link when available.
    """
    customer = order.customer
    amount = float(order.amount_ils or 0)
    if amount <= 0:
        raise ICountError('סכום הזמנה לא תקין לחשבונית')

    description = (
        f'הזמנה {order.order_number} — לוטו '
        f'({order.forms_count} טבלאות, הגרלה {order.draw_name or ""})'
    ).strip()

    body = _with_company({
        'doctype': _resolve_doctype(),
        'lang': 'he',
        'currency_code': 'ILS',
        'doc_date': date.today().strftime('%Y%m%d'),
        'client_name': customer.display_name or customer.email,
        'email': customer.email,
        'client_phone': customer.phone or '',
        'hwc': order.order_number,
        'items': [
            {
                'description': description,
                'quantity': 1,
                'unitprice': amount,
            },
        ],
    })

    url = _create_url()

    try:
        res = requests.post(url, json=body, headers=_auth_headers(), timeout=30)
    except requests.RequestException as exc:
        logger.exception('iCount request failed order=%s', order.order_number)
        raise ICountError('לא ניתן להתחבר ל-iCount') from exc

    if res.status_code >= 400:
        logger.error('iCount HTTP %s order=%s body=%s', res.status_code, order.order_number, res.text[:500])
        raise ICountError(f'iCount HTTP {res.status_code}: {res.text[:200]}')

    data = _parse_icount_response(res)
    parsed = _extract_doc_fields(data)

    if not parsed.get('doc_number') and not parsed.get('doc_id'):
        raise ICountError(
            f'iCount לא החזיר מספר מסמך. תשובה: {str(data)[:300]}',
        )

    logger.info(
        'iCount invoice order=%s doc_number=%s doc_id=%s',
        order.order_number,
        parsed.get('doc_number'),
        parsed.get('doc_id'),
    )
    return parsed


def fetch_document_pdf_link(*, doc_id: str = '', doc_number: str = '') -> str | None:
    """Resolve PDF URL from iCount doc/info when not stored on the order."""
    doc_id = (doc_id or '').strip()
    doc_number = (doc_number or '').strip()
    if not doc_id and not doc_number:
        return None

    body: dict = _with_company({'get_pdf_link': True})
    if doc_id:
        body['doc_id'] = doc_id
    if doc_number:
        body['docnum'] = doc_number

    url = f'{_api_base_url()}/doc/info'
    try:
        res = requests.post(url, json=body, headers=_auth_headers(), timeout=20)
        res.raise_for_status()
        data = _parse_icount_response(res)
        inner = data.get('data') if isinstance(data.get('data'), dict) else data
        return inner.get('pdf_link') or inner.get('pdf_url') or inner.get('doc_url')
    except (ICountError, requests.RequestException) as exc:
        logger.warning('iCount doc/info failed doc_id=%s: %s', doc_id, exc)
        return None
