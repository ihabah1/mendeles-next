"""Search Console sync — real API data only."""

from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone
from googleapiclient.discovery import build

from integrations.application.google_oauth_service import GoogleOAuthError, GoogleOAuthService
from integrations.domain.enums import ConnectionStatus, GoogleServiceType, SyncStatus
from integrations.infrastructure.models import GoogleProperty, GoogleServiceConnection, IntegrationSyncRecord


class SearchConsoleService:
    @classmethod
    def list_properties(cls, tenant_id) -> list[dict]:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        if GoogleOAuthService.effective_status(conn) not in {
            ConnectionStatus.CONNECTED,
            ConnectionStatus.WAITING_AUTHORIZATION,
        }:
            raise GoogleOAuthError("Search Console is not connected.")
        creds = GoogleOAuthService.get_credentials(conn)
        service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
        sites = service.sites().list().execute()
        entries = sites.get("siteEntry", [])
        results = []
        for entry in entries:
            site_url = entry.get("siteUrl", "")
            label = site_url
            prop, _ = GoogleProperty.objects.update_or_create(
                tenant_id=tenant_id,
                service_type=GoogleServiceType.SEARCH_CONSOLE,
                external_id=site_url,
                defaults={"label": label, "is_active": site_url == conn.property_id},
            )
            results.append({"id": site_url, "label": label, "is_active": prop.is_active})
        return results

    @classmethod
    def set_active_property(cls, tenant_id, property_id: str) -> GoogleServiceConnection:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        if not conn.encrypted_refresh_token:
            raise GoogleOAuthError("Connect Search Console before selecting a property.")
        conn.property_id = property_id
        conn.property_label = property_id
        conn.status = ConnectionStatus.CONNECTED
        conn.save(update_fields=["property_id", "property_label", "status", "updated_at"])
        GoogleProperty.objects.filter(
            tenant_id=tenant_id, service_type=GoogleServiceType.SEARCH_CONSOLE
        ).update(is_active=False)
        GoogleProperty.objects.filter(
            tenant_id=tenant_id,
            service_type=GoogleServiceType.SEARCH_CONSOLE,
            external_id=property_id,
        ).update(is_active=True)
        return conn

    @classmethod
    def sync(cls, tenant_id, *, job=None) -> IntegrationSyncRecord:
        conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED:
            raise GoogleOAuthError(
                "Search Console is not connected or no property selected. "
                "Complete OAuth and select a verified property."
            )
        if not conn.property_id:
            raise GoogleOAuthError("Select an active Search Console property before syncing.")

        creds = GoogleOAuthService.get_credentials(conn)
        service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
        end = date.today()
        start = end - timedelta(days=28)
        body = {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query", "page", "country", "device"],
            "rowLimit": 25000,
        }
        response = service.searchanalytics().query(siteUrl=conn.property_id, body=body).execute()
        rows = response.get("rows", [])
        processed = {
            "queries": [],
            "summary": {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0},
        }
        total_clicks = 0
        total_impressions = 0
        weighted_position = 0.0
        for row in rows:
            keys = row.get("keys", [])
            clicks = row.get("clicks", 0)
            impressions = row.get("impressions", 0)
            ctr = row.get("ctr", 0)
            position = row.get("position", 0)
            total_clicks += clicks
            total_impressions += impressions
            weighted_position += position * impressions
            processed["queries"].append(
                {
                    "query": keys[0] if len(keys) > 0 else "",
                    "page": keys[1] if len(keys) > 1 else "",
                    "country": keys[2] if len(keys) > 2 else "",
                    "device": keys[3] if len(keys) > 3 else "",
                    "clicks": clicks,
                    "impressions": impressions,
                    "ctr": ctr,
                    "position": position,
                }
            )
        if total_impressions:
            processed["summary"] = {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "ctr": total_clicks / total_impressions if total_impressions else 0,
                "position": weighted_position / total_impressions,
            }

        now = timezone.now()
        record = IntegrationSyncRecord.objects.create(
            tenant_id=tenant_id,
            service_type=GoogleServiceType.SEARCH_CONSOLE,
            source="search_console_api",
            retrieved_at=now,
            raw_response=response,
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
