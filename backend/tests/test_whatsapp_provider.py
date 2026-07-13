import pytest

from whatsapp.application.config import WhatsAppConfig
from whatsapp.domain.enums import ConnectionState, HealthStatus, QrStatus
from whatsapp.providers.evolution import EvolutionProvider


def test_config_from_env_defaults(monkeypatch):
    monkeypatch.delenv("WHATSAPP_PROVIDER", raising=False)
    monkeypatch.delenv("EVOLUTION_API_URL", raising=False)
    cfg = WhatsAppConfig.from_env()
    assert cfg.provider == "evolution"
    assert cfg.is_evolution_configured() is False


def test_config_is_configured_when_env_set(monkeypatch):
    monkeypatch.setenv("EVOLUTION_API_URL", "https://evo.test")
    monkeypatch.setenv("EVOLUTION_API_KEY", "key")
    monkeypatch.setenv("EVOLUTION_INSTANCE", "mendeles")
    cfg = WhatsAppConfig.from_env()
    assert cfg.is_evolution_configured() is True


def test_evolution_provider_mock_status():
    cfg = WhatsAppConfig(
        provider="evolution",
        evolution_api_url="",
        evolution_api_key="",
        evolution_instance="",
    )
    provider = EvolutionProvider(cfg)
    status = provider.get_status()
    assert status.configured is False
    assert status.connection_status == ConnectionState.NOT_CONNECTED
    assert status.message == "WhatsApp is not connected yet."


def test_evolution_provider_mock_health():
    cfg = WhatsAppConfig(provider="evolution", evolution_api_url="", evolution_api_key="", evolution_instance="")
    provider = EvolutionProvider(cfg)
    health = provider.health_check()
    assert health.configured is False
    assert health.reachable is False
    assert health.status == HealthStatus.UNKNOWN


def test_evolution_provider_connect_unconfigured():
    cfg = WhatsAppConfig(provider="evolution", evolution_api_url="", evolution_api_key="", evolution_instance="")
    provider = EvolutionProvider(cfg)
    result = provider.connect()
    assert result.ok is False
    assert result.qr_status == QrStatus.UNAVAILABLE


def test_evolution_provider_get_qr_unconfigured():
    cfg = WhatsAppConfig(provider="evolution", evolution_api_url="", evolution_api_key="", evolution_instance="")
    provider = EvolutionProvider(cfg)
    qr = provider.get_qr()
    assert qr.qr_status == QrStatus.UNAVAILABLE
    assert qr.qr_code is None
