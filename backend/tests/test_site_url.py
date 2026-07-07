import pytest

from seo.application.site_url import (
    LOCAL_DEV_SITE_URL,
    PRODUCTION_SITE_URL,
    normalize_site_url,
    resolve_site_url,
    sanitize_seo_url,
)


@pytest.fixture
def prod_env(monkeypatch):
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)


@pytest.fixture
def dev_env(monkeypatch):
    monkeypatch.setenv("DEBUG", "true")


def test_normalize_strips_www_and_forces_https(prod_env):
    assert normalize_site_url("https://www.mendeles.com") == PRODUCTION_SITE_URL
    assert normalize_site_url("http://mendeles.com") == PRODUCTION_SITE_URL


def test_resolve_production_ignores_localhost_stored(prod_env, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    assert resolve_site_url("http://localhost:3000") == PRODUCTION_SITE_URL


def test_resolve_production_prefers_env_site_url(prod_env, monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://mendeles.com")
    assert resolve_site_url("") == PRODUCTION_SITE_URL


def test_resolve_dev_uses_localhost(dev_env, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    assert resolve_site_url("http://localhost:3000") == LOCAL_DEV_SITE_URL


def test_sanitize_rewrites_localhost_to_production(prod_env, monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://mendeles.com")
    assert sanitize_seo_url("http://localhost:3000/blog") == "https://mendeles.com/blog"


def test_sanitize_upgrades_http_in_production(prod_env, monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://mendeles.com")
    assert sanitize_seo_url("http://mendeles.com/about") == "https://mendeles.com/about"
