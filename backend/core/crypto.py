"""Symmetric encryption for integration secrets (refresh tokens)."""

from __future__ import annotations

import base64
import hashlib

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    raw = getattr(settings, "INTEGRATIONS_ENCRYPTION_KEY", "") or settings.SECRET_KEY
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_value(plain: str) -> str:
    if not plain:
        return ""
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_value(cipher: str) -> str:
    if not cipher:
        return ""
    try:
        return _fernet().decrypt(cipher.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt integration secret") from exc
