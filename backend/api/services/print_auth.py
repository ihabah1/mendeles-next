"""Shared auth for print kiosk software — PRINT_API_KEY / PRINTER_KEY or per-kiosk apiKey."""
from __future__ import annotations

import os

from django.conf import settings

from admin_panel.portal.models import Kiosk


def print_api_key_header() -> str:
    return (
        getattr(settings, 'PRINT_API_KEY_HEADER', '')
        or os.getenv('PRINT_API_KEY_HEADER', 'x-api-key')
        or 'x-api-key'
    ).strip() or 'x-api-key'


def expected_print_api_key() -> str:
    return (
        getattr(settings, 'PRINT_API_KEY', '')
        or getattr(settings, 'PRINTER_KEY', '')
        or os.getenv('PRINT_API_KEY', '')
        or os.getenv('PRINTER_KEY', '')
    ).strip()


def received_api_key(request) -> str:
    header = print_api_key_header()
    for name in (header, 'X-Api-Key', 'x-api-key', 'X-Kiosk-Key', 'Authorization'):
        raw = (request.headers.get(name) or '').strip()
        if not raw:
            continue
        if name == 'Authorization' and raw.lower().startswith('bearer '):
            raw = raw[7:].strip()
        if raw:
            return raw
    return ''


def authenticate_print_client(request) -> tuple[bool, Kiosk | None]:
    """True if PRINT_API_KEY/PRINTER_KEY or active kiosk apiKey."""
    received = received_api_key(request)
    if not received:
        return False, None
    expected = expected_print_api_key()
    if expected and received == expected:
        return True, None
    kiosk = Kiosk.objects.filter(api_key=received, is_active=True).first()
    if kiosk:
        return True, kiosk
    return False, None
