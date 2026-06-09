"""Shared order/customer search for staff admin views."""
from django.db.models import Q


def parse_bool_query(value) -> bool | None:
    if value is None:
        return None
    raw = str(value).strip().lower()
    if not raw:
        return None
    if raw in ('1', 'true', 'yes', 'on'):
        return True
    if raw in ('0', 'false', 'no', 'off'):
        return False
    return None


def _scan_field(prefix: str) -> str:
    return f'{prefix}scan_pdf'


def _invoice_q(prefix: str, *, has_invoice: bool) -> Q:
    p = prefix
    doc = Q(**{f'{p}icount_doc_number__gt': ''})
    link = Q(**{f'{p}icount_pdf_link__gt': ''})
    issued = Q(**{f'{p}invoice_issued_at__isnull': False})
    if has_invoice:
        return doc | link | issued
    return (
        (Q(**{f'{p}icount_doc_number': ''}) | Q(**{f'{p}icount_doc_number__isnull': True}))
        & (Q(**{f'{p}icount_pdf_link': ''}) | Q(**{f'{p}icount_pdf_link__isnull': True}))
        & Q(**{f'{p}invoice_issued_at__isnull': True})
    )


def apply_order_doc_filters(
    qs,
    *,
    has_scan=None,
    has_invoice=None,
    prefix: str = '',
):
    """Filter by scan PDF and/or iCount invoice presence."""
    scan_flag = parse_bool_query(has_scan)
    invoice_flag = parse_bool_query(has_invoice)
    scan_field = _scan_field(prefix)

    if scan_flag is True:
        qs = qs.exclude(**{f'{scan_field}__isnull': True}).exclude(**{scan_field: b''})
    elif scan_flag is False:
        qs = qs.filter(Q(**{f'{scan_field}__isnull': True}) | Q(**{scan_field: b''}))

    if invoice_flag is True:
        qs = qs.filter(_invoice_q(prefix, has_invoice=True))
    elif invoice_flag is False:
        qs = qs.filter(_invoice_q(prefix, has_invoice=False))

    return qs


def apply_order_search(qs, query: str, *, prefix: str = ''):
    """
    Filter an Order queryset (or related) by order number or customer fields.

    prefix: e.g. ``order__`` when filtering PrintJob querysets.
    """
    q = (query or '').strip()
    if not q or len(q) < 2:
        return qs

    p = prefix
    phone = q.replace('-', '').replace(' ', '')

    return qs.filter(
        Q(**{f'{p}order_number__icontains': q})
        | Q(**{f'{p}customer__email__icontains': q})
        | Q(**{f'{p}customer__phone__icontains': q})
        | Q(**{f'{p}customer__phone__icontains': phone})
        | Q(**{f'{p}customer__username__icontains': q})
        | Q(**{f'{p}customer__first_name__icontains': q})
        | Q(**{f'{p}customer__last_name__icontains': q})
        | Q(**{f'{p}customer__full_name__icontains': q})
    ).distinct()
