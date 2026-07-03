from django.core.management.base import BaseCommand

from automation.application.job_service import JobService
from automation.domain.enums import JobType
from integrations.application.google_oauth_service import GoogleOAuthService
from integrations.domain.enums import ConnectionStatus, GoogleServiceType
from integrations.infrastructure.models import GoogleServiceConnection
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Enqueue daily Google Search Console, Analytics, and Trends sync jobs for connected tenants."

    def handle(self, *args, **options):
        from identity.infrastructure.models import User

        for tenant in Tenant.objects.filter(deleted_at__isnull=True, status="active"):
            owner = User.objects.filter(default_tenant=tenant, is_active=True, deleted_at__isnull=True).first()
            if not owner:
                continue
            for service_type in (GoogleServiceType.SEARCH_CONSOLE, GoogleServiceType.ANALYTICS):
                conn = GoogleOAuthService.get_or_create_connection(tenant.id, service_type)
                if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED:
                    continue
                job_type = (
                    JobType.SEARCH_CONSOLE_SYNC
                    if service_type == GoogleServiceType.SEARCH_CONSOLE
                    else JobType.REFRESH_METRICS
                )
                job = JobService.create_job(
                    tenant.id,
                    owner,
                    {
                        "name": f"Daily {service_type} sync",
                        "job_type": job_type.value,
                        "config": {"service_type": service_type},
                    },
                )
                JobService.queue_job(tenant.id, owner, job.id)
                self.stdout.write(f"  Queued {service_type} for {tenant.slug}")

            trends_conn = GoogleOAuthService.get_or_create_connection(tenant.id, GoogleServiceType.TRENDS)
            if trends_conn.sync_enabled:
                job = JobService.create_job(
                    tenant.id,
                    owner,
                    {
                        "name": "Daily Google Trends refresh",
                        "job_type": JobType.GOOGLE_TRENDS_SYNC.value,
                        "config": {
                            "service_type": GoogleServiceType.TRENDS,
                            "keywords": ["mendeles"],
                            "countries": ["IL", "US"],
                            "date_range": "7d",
                        },
                    },
                )
                JobService.queue_job(tenant.id, owner, job.id)
                self.stdout.write(f"  Queued trends for {tenant.slug}")
        self.stdout.write(self.style.SUCCESS("Daily Google sync jobs queued where connected."))
