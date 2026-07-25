"""Campaign performance report — visits after publish via GA4 UTMs."""

from __future__ import annotations

import csv
import io
import logging
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from django.utils import timezone

from social.domain.enums import CampaignStatus
from social.infrastructure.models import SocialCampaign

logger = logging.getLogger(__name__)


def campaign_tracking_code(campaign: SocialCampaign | str) -> str:
    """Stable utm_campaign value used in published links and GA4 matching."""
    cid = str(getattr(campaign, "id", campaign) or "")
    return f"md-{cid.replace('-', '')[:12]}"


def tracked_website_url(campaign: SocialCampaign, *, platform: str = "") -> str:
    """Append UTM params to campaign website_url for visit attribution."""
    base = (campaign.website_url or "https://mendeles.com").strip() or "https://mendeles.com"
    if not base.startswith("http://") and not base.startswith("https://"):
        base = f"https://{base}"
    parsed = urlparse(base)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["utm_source"] = "mendeles"
    query["utm_medium"] = "social"
    query["utm_campaign"] = campaign_tracking_code(campaign)
    if platform:
        query["utm_content"] = platform
    return urlunparse(parsed._replace(query=urlencode(query)))


class CampaignReportService:
    @classmethod
    def build_report(cls, tenant_id, *, refresh_ga4: bool = False) -> dict[str, Any]:
        campaigns = list(
            SocialCampaign.objects.filter(
                tenant_id=tenant_id,
                deleted_at__isnull=True,
                status__in=[CampaignStatus.PUBLISHED, CampaignStatus.SCHEDULED],
            ).order_by("-published_at", "-scheduled_at", "-created_at")[:200]
        )

        ga4 = cls._fetch_ga4_campaign_sessions(tenant_id, refresh=refresh_ga4)
        by_code = ga4.get("by_campaign") or {}

        rows: list[dict[str, Any]] = []
        for campaign in campaigns:
            code = campaign_tracking_code(campaign)
            metrics = by_code.get(code) or by_code.get(code.lower()) or {}
            event_at = campaign.published_at or campaign.scheduled_at or campaign.created_at
            rows.append(
                {
                    "campaign_id": str(campaign.id),
                    "campaign_name": campaign.title or "Untitled",
                    "status": campaign.status,
                    "platforms": campaign.platforms or [],
                    "published_at": campaign.published_at.isoformat() if campaign.published_at else None,
                    "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
                    "event_at": event_at.isoformat() if event_at else None,
                    "tracking_code": code,
                    "tracked_url": tracked_website_url(campaign),
                    "sessions": int(metrics.get("sessions") or 0) if metrics else None,
                    "pageviews": int(metrics.get("screenPageViews") or metrics.get("pageviews") or 0)
                    if metrics
                    else None,
                    "users": int(metrics.get("activeUsers") or metrics.get("users") or 0) if metrics else None,
                    "visits_available": bool(metrics),
                }
            )

        return {
            "generated_at": timezone.now().isoformat(),
            "ga4_connected": bool(ga4.get("connected")),
            "ga4_error": ga4.get("error") or "",
            "ga4_note": ga4.get("note")
            or (
                "כניסות מיוחסות לפי UTM (utm_campaign) שנשלח בקישור בפרסום. "
                "קמפיינים שפורסמו לפני הוספת ה-UTM יופיעו ללא כניסות."
            ),
            "rows": rows,
            "totals": {
                "campaigns": len(rows),
                "sessions": sum(int(r["sessions"] or 0) for r in rows if r.get("visits_available")),
                "pageviews": sum(int(r["pageviews"] or 0) for r in rows if r.get("visits_available")),
            },
        }

    @classmethod
    def export_csv(cls, tenant_id) -> str:
        report = cls.build_report(tenant_id, refresh_ga4=False)
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "campaign_name",
                "status",
                "platforms",
                "published_at",
                "scheduled_at",
                "event_at",
                "tracking_code",
                "sessions",
                "pageviews",
                "users",
                "tracked_url",
            ]
        )
        for row in report["rows"]:
            writer.writerow(
                [
                    row.get("campaign_name") or "",
                    row.get("status") or "",
                    ",".join(row.get("platforms") or []),
                    row.get("published_at") or "",
                    row.get("scheduled_at") or "",
                    row.get("event_at") or "",
                    row.get("tracking_code") or "",
                    "" if row.get("sessions") is None else row.get("sessions"),
                    "" if row.get("pageviews") is None else row.get("pageviews"),
                    "" if row.get("users") is None else row.get("users"),
                    row.get("tracked_url") or "",
                ]
            )
        return buf.getvalue()

    @classmethod
    def _fetch_ga4_campaign_sessions(cls, tenant_id, *, refresh: bool = False) -> dict[str, Any]:
        try:
            from integrations.application.google_oauth_service import GoogleOAuthError, GoogleOAuthService
            from integrations.domain.enums import ConnectionStatus, GoogleServiceType
            from google.analytics.data_v1beta import BetaAnalyticsDataClient
            from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
        except Exception as exc:  # noqa: BLE001
            return {"connected": False, "error": str(exc), "by_campaign": {}, "note": ""}

        try:
            conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.ANALYTICS)
            if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED or not conn.property_id:
                return {
                    "connected": False,
                    "error": "Google Analytics לא מחובר או לא נבחר Property.",
                    "by_campaign": {},
                    "note": "חברו GA4 תחת הגדרות → אינטגרציות Google.",
                }
            creds = GoogleOAuthService.get_credentials(conn)
            client = BetaAnalyticsDataClient(credentials=creds)
            request = RunReportRequest(
                property=conn.property_id,
                date_ranges=[DateRange(start_date="90daysAgo", end_date="today")],
                dimensions=[Dimension(name="sessionCampaignName")],
                metrics=[
                    Metric(name="sessions"),
                    Metric(name="screenPageViews"),
                    Metric(name="activeUsers"),
                ],
            )
            response = client.run_report(request)
            by_campaign: dict[str, dict[str, int]] = {}
            for row in response.rows:
                name = (row.dimension_values[0].value or "").strip()
                if not name or name == "(not set)":
                    continue
                metrics = {
                    response.metric_headers[i].name: int(float(row.metric_values[i].value or 0))
                    for i in range(len(response.metric_headers))
                }
                by_campaign[name] = metrics
                by_campaign[name.lower()] = metrics
            return {
                "connected": True,
                "error": "",
                "by_campaign": by_campaign,
                "note": "נתוני GA4 ל־90 הימים האחרונים לפי sessionCampaignName (utm_campaign).",
                "refreshed": refresh,
                "retrieved_at": timezone.now().isoformat(),
            }
        except GoogleOAuthError as exc:
            return {"connected": False, "error": str(exc), "by_campaign": {}, "note": ""}
        except Exception as exc:  # noqa: BLE001
            logger.exception("campaign_report_ga4_failed tenant_id=%s", tenant_id)
            return {
                "connected": False,
                "error": f"GA4 report failed: {exc}",
                "by_campaign": {},
                "note": "",
            }
