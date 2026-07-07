import os
from urllib.parse import urlparse, urlunparse

PRODUCTION_SITE_URL = "https://mendeles.com"
LOCAL_DEV_SITE_URL = "http://localhost:3000"


def _is_local_host(hostname: str) -> bool:
    return hostname in {"localhost", "127.0.0.1"} or hostname.endswith(".localhost")


def is_production_runtime() -> bool:
    env = (os.environ.get("APP_ENV") or os.environ.get("RAILWAY_ENVIRONMENT") or "").lower()
    if env in {"development", "staging", "stage"}:
        return False
    if env in {"production", "prod"}:
        return True
    return os.environ.get("DEBUG", "false").lower() != "true"


def normalize_site_url(url: str) -> str:
    trimmed = (url or "").strip()
    if not trimmed:
        return ""

    if not trimmed.startswith(("http://", "https://")):
        trimmed = f"https://{trimmed}"

    parsed = urlparse(trimmed)
    hostname = (parsed.hostname or "").lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]

    port_suffix = f":{parsed.port}" if parsed.port else ""
    netloc = f"{hostname}{port_suffix}"

    scheme = parsed.scheme
    if is_production_runtime() or not _is_local_host(hostname):
        scheme = "https"

    return urlunparse((scheme, netloc, "", "", "", "")).rstrip("/")


def resolve_site_url(stored: str = "") -> str:
    candidates = [
        stored,
        os.environ.get("SITE_URL", ""),
        os.environ.get("NEXT_PUBLIC_SITE_URL", ""),
        os.environ.get("FRONTEND_URL", ""),
    ]

    for candidate in candidates:
        normalized = normalize_site_url(candidate)
        if not normalized:
            continue
        if is_production_runtime() and _is_local_host(urlparse(normalized).hostname or ""):
            continue
        return normalized

    return PRODUCTION_SITE_URL if is_production_runtime() else LOCAL_DEV_SITE_URL


def absolute_site_url(path: str, base: str | None = None) -> str:
    site = (base or resolve_site_url()).rstrip("/")
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{site}{normalized}"


def sanitize_seo_url(url: str, base: str | None = None) -> str:
    site_base = (base or resolve_site_url()).rstrip("/")
    trimmed = (url or "").strip()
    if not trimmed:
        return site_base

    parsed = urlparse(trimmed if "://" in trimmed else f"{site_base}{trimmed if trimmed.startswith('/') else '/' + trimmed}")
    hostname = parsed.hostname or ""
    if _is_local_host(hostname) or parsed.scheme == "http":
        return f"{site_base}{parsed.path or ''}{'?' + parsed.query if parsed.query else ''}"

    if is_production_runtime() and parsed.scheme == "http":
        parsed = parsed._replace(scheme="https")
        return urlunparse(parsed)

    return trimmed
