"""Integration sync orchestration + automation job enqueue."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from automation.application.job_service import JobService
from automation.domain.enums import JobType
from integrations.application.analytics_service import AnalyticsService
from integrations.application.google_oauth_service import GoogleOAuthError
from integrations.application.search_console_service import SearchConsoleService
from integrations.application.trends_service import TrendsService
from integrations.domain.enums import GoogleServiceType
from integrations.infrastructure.models import GoogleServiceConnection, IntegrationSyncRecord


class IntegrationSyncService:
    JOB_TYPE_BY_SERVICE = {
        GoogleServiceType.SEARCH_CONSOLE: JobType.SEARCH_CONSOLE_SYNC,
        GoogleServiceType.ANALYTICS: JobType.REFRESH_METRICS,
        GoogleServiceType.TRENDS: JobType.GOOGLE_TRENDS_SYNC,
    }

    @classmethod
    def enqueue_sync(cls, tenant_id, user, service_type: str, *, config: dict | None = None, request=None):
        job_type = cls.JOB_TYPE_BY_SERVICE.get(service_type)
        if not job_type:
            raise ValueError(f"Unknown service: {service_type}")
        config = config or {}
        config["service_type"] = service_type
        job = JobService.create_job(
            tenant_id,
            user,
            {
                "name": f"Sync {service_type}",
                "job_type": job_type.value,
                "config": config,
            },
            request=request,
        )
        return JobService.queue_job(tenant_id, user, job.id, request=request)

    @classmethod
    def run_sync_for_job(cls, job) -> IntegrationSyncRecord:
        service_type = (job.config or {}).get("service_type")
        tenant_id = job.tenant_id
        if service_type == GoogleServiceType.SEARCH_CONSOLE:
            return SearchConsoleService.sync(tenant_id, job=job)
        if service_type == GoogleServiceType.ANALYTICS:
            return AnalyticsService.sync(tenant_id, job=job)
        if service_type == GoogleServiceType.TRENDS:
            cfg = job.config or {}
            return TrendsService.sync(
                tenant_id,
                keywords=cfg.get("keywords") or ["mendeles"],
                language=cfg.get("language"),
                country=cfg.get("country", "IL"),
                countries=cfg.get("countries"),
                date_range=cfg.get("date_range", "7d"),
                job=job,
            )
        raise ValueError(f"Unsupported sync service: {service_type}")

    @classmethod
    def dashboard(cls, tenant_id) -> dict:
        from integrations.application.google_oauth_service import GoogleOAuthService
        from integrations.application.google_config import oauth_configured, setup_instructions

        services = []
        for st in GoogleServiceType:
            conn = GoogleOAuthService.get_or_create_connection(tenant_id, st)
            services.append(GoogleOAuthService.serialize_connection(conn))

        recent = IntegrationSyncRecord.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by(
            "-retrieved_at"
        )[:10]

        return {
            "oauth_platform_configured": oauth_configured(),
            "setup_instructions": setup_instructions() if not oauth_configured() else [],
            "services": services,
            "recent_syncs": [
                {
                    "id": str(r.id),
                    "service_type": r.service_type,
                    "sync_status": r.sync_status,
                    "retrieved_at": r.retrieved_at.isoformat(),
                    "error_message": r.error_message or None,
                }
                for r in recent
            ],
        }

    @classmethod
    def schedule_daily_syncs(cls, tenant_id, user, *, request=None) -> list:
        """Create daily scheduled sync jobs when connections are ready."""
        queued = []
        for conn in GoogleServiceConnection.objects.filter(tenant_id=tenant_id, sync_enabled=True, deleted_at__isnull=True):
            if conn.service_type == GoogleServiceType.TRENDS:
                continue
            from integrations.application.google_oauth_service import GoogleOAuthService
            from integrations.domain.enums import ConnectionStatus

            if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED:
                continue
            job = cls.enqueue_sync(tenant_id, user, conn.service_type, request=request)
            conn.next_sync_at = timezone.now() + timedelta(days=1)
            conn.save(update_fields=["next_sync_at", "updated_at"])
            queued.append(job)
        return queued
