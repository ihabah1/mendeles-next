"""Google Analytics 4 sync — real API data only."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.analytics.admin_v1beta import AnalyticsAdminServiceClient

from integrations.application.google_oauth_service import GoogleOAuthError, GoogleOAuthService
from integrations.domain.enums import ConnectionStatus, GoogleServiceType, SyncStatus
from integrations.infrastructure.models import GoogleProperty, GoogleServiceConnection, IntegrationSyncRecord


class AnalyticsService:
    @classmethod
    def list_properties(cls, tenant_id) -> list[dict]:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.ANALYTICS)
        if not conn.encrypted_refresh_token:
            raise GoogleOAuthError("Google Analytics is not connected.")
        creds = GoogleOAuthService.get_credentials(conn)
        admin = AnalyticsAdminServiceClient(credentials=creds)
        results = []
        for account in admin.list_account_summaries():
            for prop in account.property_summaries:
                prop_name = prop.property
                label = prop.display_name or prop_name
                results.append({"id": prop_name, "label": label, "is_active": prop_name == conn.property_id})
                GoogleProperty.objects.update_or_create(
                    tenant_id=tenant_id,
                    service_type=GoogleServiceType.ANALYTICS,
                    external_id=prop_name,
                    defaults={"label": label, "is_active": prop_name == conn.property_id},
                )
        return results

    @classmethod
    def set_active_property(cls, tenant_id, property_id: str, *, label: str = "") -> GoogleServiceConnection:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.ANALYTICS)
        if not conn.encrypted_refresh_token:
            raise GoogleOAuthError("Connect Google Analytics before selecting a property.")
        conn.property_id = property_id
        conn.property_label = label or property_id
        conn.status = ConnectionStatus.CONNECTED
        conn.save(update_fields=["property_id", "property_label", "status", "updated_at"])
        GoogleProperty.objects.filter(tenant_id=tenant_id, service_type=GoogleServiceType.ANALYTICS).update(
            is_active=False
        )
        GoogleProperty.objects.filter(
            tenant_id=tenant_id, service_type=GoogleServiceType.ANALYTICS, external_id=property_id
        ).update(is_active=True)
        return conn

    @classmethod
    def sync(cls, tenant_id, *, job=None) -> IntegrationSyncRecord:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.ANALYTICS)
        if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED:
            raise GoogleOAuthError(
                "Google Analytics is not connected or no GA4 property selected."
            )
        creds = GoogleOAuthService.get_credentials(conn)
        client = BetaAnalyticsDataClient(credentials=creds)
        request = RunReportRequest(
            property=conn.property_id,
            date_ranges=[DateRange(start_date="28daysAgo", end_date="today")],
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="conversions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
            ],
        )
        response = client.run_report(request)
        processed = {"metrics": {}}
        raw_rows = []
        for row in response.rows:
            metric_values = {m.name: row.metric_values[i].value for i, m in enumerate(response.metric_headers)}
            raw_rows.append(metric_values)
            processed["metrics"] = metric_values

        now = timezone.now()
        record = IntegrationSyncRecord.objects.create(
            tenant_id=tenant_id,
            service_type=GoogleServiceType.ANALYTICS,
            source="ga4_data_api",
            retrieved_at=now,
            raw_response={"rows": raw_rows, "row_count": response.row_count},
            processed_data=processed,
            sync_status=SyncStatus.SUCCESS,
            last_sync_at=now,
            automation_job=job,
        )
        conn.last_sync_at = now
        conn.next_sync_at = now + timedelta(days=1)
        conn.last_error = ""
        conn.status = ConnectionStatus.CONNECTED
        conn.save(update_fields=["last_sync_at", "next_sync_at", "last_error", "status", "updated_at"])
        return record
