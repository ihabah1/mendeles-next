"""Persist integration events for admin diagnostics."""
from __future__ import annotations

import json
from typing import Any

from admin_panel.portal.models import IntegrationLog, Order


def _safe_details(details: Any, max_len: int = 4000) -> dict:
    if details is None:
        return {}
    if isinstance(details, dict):
        payload = details
    else:
        payload = {'value': str(details)}
    try:
        text = json.dumps(payload, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(payload)
    if len(text) > max_len:
        return {'truncated': True, 'preview': text[:max_len]}
    return payload


def log_integration(
    source: str,
    level: str,
    message: str,
    *,
    order: Order | None = None,
    details: Any = None,
) -> IntegrationLog:
    return IntegrationLog.objects.create(
        source=source,
        level=level,
        message=message[:500],
        order=order,
        details=_safe_details(details),
    )


def recent_integration_logs(*, source: str = '', limit: int = 80) -> list[dict]:
    qs = IntegrationLog.objects.select_related('order').order_by('-created_at')
    if source:
        qs = qs.filter(source=source)
    qs = qs[:limit]
    rows = []
    for row in qs:
        rows.append({
            'id': row.id,
            'source': row.source,
            'level': row.level,
            'message': row.message,
            'orderId': row.order_id,
            'orderNumber': row.order.order_number if row.order_id else None,
            'details': row.details or {},
            'createdAt': row.created_at.isoformat(),
        })
    return rows
