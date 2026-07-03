"""Google Trends via pytrends — public data, no OAuth."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from integrations.domain.enums import (
    ConnectionStatus,
    GoogleServiceType,
    SyncStatus,
    TrendsCountry,
    TrendsDateRange,
    TRENDS_MARKET_CONFIG,
)
from integrations.infrastructure.models import GoogleServiceConnection, IntegrationSyncRecord


class TrendsService:
    @staticmethod
    def _timeframe(date_range: str) -> str:
        mapping = {
            TrendsDateRange.HOURS_24: "now 1-d",
            TrendsDateRange.DAYS_7: "now 7-d",
            TrendsDateRange.DAYS_30: "today 1-m",
        }
        return mapping.get(date_range, "now 7-d")

    @staticmethod
    def _hl(language: str) -> str:
        return "iw" if language == "he" else "en"

    @classmethod
    def normalize_countries(cls, *, country: str = "IL", countries: list[str] | None = None) -> list[str]:
        raw = countries if countries else [country]
        valid = {c.value for c in TrendsCountry}
        normalized = []
        for code in raw:
            upper = (code or "").upper()
            if upper not in valid:
                raise ValueError(f"Unsupported Trends country: {code}. Use IL or US.")
            if upper not in normalized:
                normalized.append(upper)
        return normalized or [TrendsCountry.ISRAEL]

    @classmethod
    def _sync_market(
        cls,
        tenant_id,
        *,
        keywords: list[str],
        country: str,
        language: str,
        date_range: str,
        job=None,
    ) -> IntegrationSyncRecord:
        from pytrends.request import TrendReq

        market = TRENDS_MARKET_CONFIG[country]
        hl = cls._hl(language)
        geo = market["geo"]
        pn = market["pn"]

        pytrends = TrendReq(hl=hl, tz=360)
        pytrends.build_payload(keywords[:5], timeframe=cls._timeframe(date_range), geo=geo)

        interest = pytrends.interest_over_time()
        if not interest.empty and "isPartial" in interest.columns:
            interest = interest.drop(columns=["isPartial"])

        related_queries = pytrends.related_queries()
        related_topics = pytrends.related_topics()
        trending = pytrends.trending_searches(pn=pn)

        raw = {
            "interest_over_time": interest.reset_index().to_dict(orient="records") if not interest.empty else [],
            "related_queries": {
                k: (v.to_dict(orient="records") if v is not None and not v.empty else [])
                for k, v in (related_queries or {}).items()
            },
            "related_topics": {
                k: (v.to_dict(orient="records") if v is not None and not v.empty else [])
                for k, v in (related_topics or {}).items()
            },
            "trending_searches": (
                trending.head(25).values.tolist() if trending is not None and not trending.empty else []
            ),
        }
        processed = {
            "keywords": keywords[:5],
            "language": language,
            "country": country,
            "date_range": date_range,
            "market": market,
            "interest_over_time": raw["interest_over_time"],
            "related_queries": raw["related_queries"],
            "related_topics": raw["related_topics"],
            "trending_searches": raw["trending_searches"],
        }

        now = timezone.now()
        return IntegrationSyncRecord.objects.create(
            tenant_id=tenant_id,
            service_type=GoogleServiceType.TRENDS,
            source="pytrends",
            language=language,
            country=country,
            retrieved_at=now,
            raw_response=raw,
            processed_data=processed,
            sync_status=SyncStatus.SUCCESS,
            last_sync_at=now,
            automation_job=job,
        )

    @classmethod
    def sync(
        cls,
        tenant_id,
        *,
        keywords: list[str] | None = None,
        language: str | None = None,
        country: str = TrendsCountry.ISRAEL,
        countries: list[str] | None = None,
        date_range: str = TrendsDateRange.DAYS_7,
        job=None,
    ) -> IntegrationSyncRecord:
        if not keywords:
            raise ValueError("Provide at least one keyword for Google Trends sync.")

        try:
            from pytrends.request import TrendReq  # noqa: F401
        except ImportError as exc:
            raise RuntimeError("pytrends is not installed on the server.") from exc

        conn, _ = GoogleServiceConnection.objects.get_or_create(
            tenant_id=tenant_id,
            service_type=GoogleServiceType.TRENDS,
            defaults={"status": ConnectionStatus.NOT_CONNECTED},
        )

        markets = cls.normalize_countries(country=country, countries=countries)
        records: list[IntegrationSyncRecord] = []
        errors: list[str] = []

        for market_code in markets:
            market_lang = language or TRENDS_MARKET_CONFIG[market_code]["default_language"]
            try:
                records.append(
                    cls._sync_market(
                        tenant_id,
                        keywords=keywords,
                        country=market_code,
                        language=market_lang,
                        date_range=date_range,
                        job=job,
                    )
                )
            except Exception as exc:
                errors.append(f"{market_code}: {exc}")

        now = timezone.now()
        if not records:
            conn.last_error = "; ".join(errors)
            conn.status = ConnectionStatus.ERROR
            conn.save(update_fields=["last_error", "status", "updated_at"])
            raise RuntimeError(conn.last_error)

        conn.last_sync_at = now
        conn.next_sync_at = now + timedelta(days=1)
        conn.last_error = "; ".join(errors) if errors else ""
        conn.status = ConnectionStatus.CONNECTED
        conn.save(update_fields=["last_sync_at", "next_sync_at", "last_error", "status", "updated_at"])
        return records[-1]
