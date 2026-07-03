import pytest

from integrations.application.trends_service import TrendsService
from integrations.domain.enums import TrendsCountry


def test_normalize_countries_single_il():
    assert TrendsService.normalize_countries(country="IL") == ["IL"]


def test_normalize_countries_both():
    assert TrendsService.normalize_countries(countries=["IL", "US"]) == ["IL", "US"]


def test_normalize_countries_dedupes():
    assert TrendsService.normalize_countries(countries=["IL", "il", "US"]) == ["IL", "US"]


def test_normalize_countries_rejects_invalid():
    with pytest.raises(ValueError, match="Unsupported"):
        TrendsService.normalize_countries(countries=["FR"])


def test_market_config_has_israel_and_us():
    from integrations.domain.enums import TRENDS_MARKET_CONFIG

    assert TRENDS_MARKET_CONFIG[TrendsCountry.ISRAEL]["pn"] == "israel"
    assert TRENDS_MARKET_CONFIG[TrendsCountry.UNITED_STATES]["pn"] == "united_states"
    assert TRENDS_MARKET_CONFIG[TrendsCountry.ISRAEL]["geo"] == "IL"
    assert TRENDS_MARKET_CONFIG[TrendsCountry.UNITED_STATES]["geo"] == "US"
