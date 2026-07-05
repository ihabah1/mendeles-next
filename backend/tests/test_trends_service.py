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


def test_to_records_handles_nested_pytrends_frames():
    class FakeFrame:
        empty = False

        def __init__(self, rows):
            self.rows = rows

        def to_dict(self, orient):
            assert orient == "records"
            return self.rows

    data = {
        "קליניקה פרטית": {
            "top": FakeFrame([{"query": "קביעת תור לרופא", "value": 100}]),
            "rising": None,
        }
    }

    assert TrendsService._to_records(data) == {
        "קליניקה פרטית": {
            "top": [{"query": "קביעת תור לרופא", "value": 100}],
            "rising": [],
        }
    }


@pytest.mark.django_db
def test_sync_market_serializes_pandas_timestamps(monkeypatch, tenant):
    import pandas as pd

    class FakeTrendReq:
        def __init__(self, *args, **kwargs):
            pass

        def build_payload(self, *args, **kwargs):
            return None

        def interest_over_time(self):
            return pd.DataFrame({"lawyer": [12]}, index=pd.to_datetime(["2026-01-01"]))

        def related_queries(self):
            return {}

        def related_topics(self):
            return {}

        def trending_searches(self, pn):
            return pd.DataFrame([["lawyer"]])

    monkeypatch.setattr("pytrends.request.TrendReq", FakeTrendReq)

    record = TrendsService._sync_market(
        tenant.id,
        keywords=["lawyer"],
        country="IL",
        language="he",
        date_range="now 1-d",
    )

    assert record.sync_status == "success"
    row = record.processed_data["interest_over_time"][0]
    date_value = next(value for value in row.values() if isinstance(value, str) and value.startswith("2026"))
    assert date_value.startswith("2026-01-01")


@pytest.mark.django_db
def test_sync_market_uses_trendreq_without_retries_kwarg(monkeypatch, tenant):
    captured: dict = {}

    class FakeTrendReq:
        def __init__(self, *args, **kwargs):
            captured.update(kwargs)

        def build_payload(self, *args, **kwargs):
            return None

        def interest_over_time(self):
            import pandas as pd

            return pd.DataFrame()

        def related_queries(self):
            return {}

        def related_topics(self):
            return {}

        def trending_searches(self, pn):
            import pandas as pd

            return pd.DataFrame()

    monkeypatch.setattr("pytrends.request.TrendReq", FakeTrendReq)

    TrendsService._sync_market(
        tenant.id,
        keywords=["lawyer"],
        country="IL",
        language="he",
        date_range="now 1-d",
    )

    assert "retries" not in captured
    assert "backoff_factor" not in captured
