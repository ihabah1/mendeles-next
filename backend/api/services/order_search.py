"""Shared order/customer search for staff admin views."""
from django.db.models import Q


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
