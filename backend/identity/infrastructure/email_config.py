"""Email sender configuration helpers."""

from __future__ import annotations

import os

VERIFIED_FROM_DOMAIN = os.environ.get("RESEND_VERIFIED_DOMAIN", "mandeles.co.il").strip() or "mandeles.co.il"
DEFAULT_FROM_ADDRESS = f"Mandeles <noreply@{VERIFIED_FROM_DOMAIN}>"

# Legacy / typo domains → verified Resend domain (mandeles.co.il has DKIM; mendeles.co.il does not exist).
_UNVERIFIED_SUFFIXES = (
    "@mendeles.ai",
    "@mandeles.ai",
    "@mendeles.com",
    "@mendeles.co.il",  # common typo (e vs a)
)


def _fix_domain(email: str) -> str:
    lower = email.lower()
    for suffix in _UNVERIFIED_SUFFIXES:
        if lower.endswith(suffix):
            return email[: -len(suffix)] + f"@{VERIFIED_FROM_DOMAIN}"
    return email


def normalize_from_email(value: str) -> str:
    """Map legacy/unverified sender domains to the verified Resend domain."""
    trimmed = (value or "").strip()
    if not trimmed:
        return DEFAULT_FROM_ADDRESS

    display_name = "Mendeles"
    email_part = trimmed
    if "<" in trimmed and ">" in trimmed:
        display_name, _, rest = trimmed.partition("<")
        display_name = display_name.strip() or "Mendeles"
        email_part = rest.split(">", 1)[0].strip()

    email_part = _fix_domain(email_part)

    if "<" in trimmed and ">" in trimmed:
        return f"{display_name} <{email_part}>"
    if "@" in email_part:
        return f"Mendeles <{email_part}>"
    return email_part


def resolve_from_email() -> str:
    raw = os.environ.get("RESEND_FROM_EMAIL", "").strip() or os.environ.get("DEFAULT_FROM_EMAIL", "").strip()
    return normalize_from_email(raw)
