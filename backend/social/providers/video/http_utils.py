"""Shared HTTP helpers + local credit ledger for video providers."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings
from django.core.cache import cache


def http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: int | None = None,
) -> dict[str, Any]:
    timeout = timeout or int(getattr(settings, "VIDEO_PROVIDER_TIMEOUT_SECONDS", 60))
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def http_bytes(url: str, *, headers: dict[str, str] | None = None, timeout: int | None = None) -> tuple[bytes, str]:
    timeout = timeout or int(getattr(settings, "VIDEO_PROVIDER_TIMEOUT_SECONDS", 60))
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        ctype = resp.headers.get("Content-Type") or "application/octet-stream"
        return resp.read(), ctype


def ledger_key(provider: str) -> str:
    return f"video_provider_credits:{provider}"


def get_ledger_credits(provider: str, default: int | None) -> int | None:
    if default is None:
        cached = cache.get(ledger_key(provider))
        return int(cached) if cached is not None else None
    cached = cache.get(ledger_key(provider))
    if cached is None:
        cache.set(ledger_key(provider), int(default), timeout=None)
        return int(default)
    return int(cached)


def consume_ledger_credits(provider: str, amount: int) -> int:
    key = ledger_key(provider)
    current = cache.get(key)
    if current is None:
        raise RuntimeError(f"{provider}: credit ledger not initialized")
    current = int(current)
    if current < amount:
        raise RuntimeError(f"{provider}: insufficient ledger credits ({current} < {amount})")
    remaining = current - amount
    cache.set(key, remaining, timeout=None)
    return remaining
