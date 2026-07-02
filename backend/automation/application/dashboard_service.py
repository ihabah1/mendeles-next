"""Real dashboard metrics from database — never fabricated."""

from django.db.models import Avg, Count, Q
from django.utils import timezone

from automation.domain.enums import JobStatus, WorkerStatus
from automation.infrastructure.models import AutomationExecution, AutomationJob, AutomationWorker


class DashboardService:
    @staticmethod
    def stats_for_tenant(tenant_id) -> dict:
        jobs = AutomationJob.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        status_counts = {
            row["status"]: row["count"]
            for row in jobs.values("status").annotate(count=Count("id"))
        }

        running = status_counts.get(JobStatus.RUNNING, 0)
        queued = status_counts.get(JobStatus.QUEUED, 0)
        scheduled = status_counts.get(JobStatus.SCHEDULED, 0)
        completed = status_counts.get(JobStatus.COMPLETED, 0)
        failed = status_counts.get(JobStatus.FAILED, 0)
        paused = status_counts.get(JobStatus.PAUSED, 0)
        waiting_approval = status_counts.get(JobStatus.WAITING_APPROVAL, 0)
        retrying = status_counts.get(JobStatus.RETRYING, 0)

        upcoming = jobs.filter(
            status=JobStatus.SCHEDULED,
            scheduled_at__gt=timezone.now(),
        ).count()

        queue_length = queued + retrying

        avg_duration = (
            AutomationExecution.objects.filter(
                job__tenant_id=tenant_id,
                job__deleted_at__isnull=True,
                duration_ms__isnull=False,
            ).aggregate(avg=Avg("duration_ms"))["avg"]
        )

        workers_total = AutomationWorker.objects.filter(deleted_at__isnull=True).count()
        workers_busy = AutomationWorker.objects.filter(
            deleted_at__isnull=True,
            status=WorkerStatus.BUSY,
        ).count()

        return {
            "status": "operational",
            "active_jobs": running + retrying,
            "scheduled_jobs": scheduled,
            "running_jobs": running,
            "completed_jobs": completed,
            "failed_jobs": failed,
            "paused_jobs": paused,
            "waiting_approval": waiting_approval,
            "queue_size": queue_length,
            "upcoming_jobs": upcoming,
            "credits_used": 0,
            "average_runtime_ms": int(avg_duration) if avg_duration else None,
            "estimated_completion_minutes": DashboardService._estimate_eta_minutes(
                tenant_id, queue_length, avg_duration
            ),
            "workers_total": workers_total,
            "workers_busy": workers_busy,
            "total_jobs": jobs.count(),
        }

    @staticmethod
    def stats_platform() -> dict:
        jobs = AutomationJob.objects.filter(deleted_at__isnull=True)
        status_counts = {
            row["status"]: row["count"]
            for row in jobs.values("status").annotate(count=Count("id"))
        }
        running = status_counts.get(JobStatus.RUNNING, 0)
        queued = status_counts.get(JobStatus.QUEUED, 0)
        scheduled = status_counts.get(JobStatus.SCHEDULED, 0)
        completed = status_counts.get(JobStatus.COMPLETED, 0)
        failed = status_counts.get(JobStatus.FAILED, 0)
        paused = status_counts.get(JobStatus.PAUSED, 0)
        waiting_approval = status_counts.get(JobStatus.WAITING_APPROVAL, 0)
        retrying = status_counts.get(JobStatus.RETRYING, 0)
        queue_length = queued + retrying

        avg_duration = AutomationExecution.objects.filter(duration_ms__isnull=False).aggregate(
            avg=Avg("duration_ms")
        )["avg"]

        workers_total = AutomationWorker.objects.filter(deleted_at__isnull=True).count()
        workers_busy = AutomationWorker.objects.filter(
            deleted_at__isnull=True, status=WorkerStatus.BUSY
        ).count()

        return {
            "status": "operational",
            "active_jobs": running + retrying,
            "scheduled_jobs": scheduled,
            "running_jobs": running,
            "completed_jobs": completed,
            "failed_jobs": failed,
            "paused_jobs": paused,
            "waiting_approval": waiting_approval,
            "queue_size": queue_length,
            "upcoming_jobs": jobs.filter(
                status=JobStatus.SCHEDULED,
                scheduled_at__gt=timezone.now(),
            ).count(),
            "credits_used": 0,
            "average_runtime_ms": int(avg_duration) if avg_duration else None,
            "estimated_completion_minutes": DashboardService._estimate_eta_minutes(
                None, queue_length, avg_duration
            ),
            "workers_total": workers_total,
            "workers_busy": workers_busy,
            "total_jobs": jobs.count(),
        }

    @staticmethod
    def recent_jobs(tenant_id=None, *, limit=8):
        qs = AutomationJob.objects.filter(deleted_at__isnull=True).select_related("created_by")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs.order_by("-updated_at")[:limit]

    @staticmethod
    def _estimate_eta_minutes(tenant_id, queue_length: int, avg_duration_ms) -> int | None:
        if queue_length == 0 or not avg_duration_ms:
            return None
        workers = AutomationWorker.objects.filter(
            deleted_at__isnull=True,
            status__in=[WorkerStatus.IDLE, WorkerStatus.BUSY],
        ).count()
        parallel = max(workers, 1)
        total_ms = queue_length * avg_duration_ms
        return max(1, int((total_ms / parallel) / 60000))
