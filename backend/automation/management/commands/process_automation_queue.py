"""Process queued automation jobs."""

import logging
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.db.models import Case, IntegerField, Value, When
from django.utils import timezone

from automation.application.executor import JobExecutor
from automation.application.notification_service import NotificationService
from automation.application.worker_service import WorkerService
from automation.domain.enums import PRIORITY_ORDER, JobStatus, NotificationType
from automation.infrastructure.models import AutomationJob, AutomationQueue

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Process queued automation jobs (database-backed worker)"

    def add_arguments(self, parser):
        parser.add_argument("--worker-id", type=str, default="")
        parser.add_argument("--limit", type=int, default=5)
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Keep polling the database instead of exiting after one batch.",
        )
        parser.add_argument(
            "--poll-seconds",
            type=float,
            default=15,
            help="Seconds between queue polls in watch mode (default: 15).",
        )

    def handle(self, *args, **options):
        worker = WorkerService.register_or_heartbeat(options["worker_id"] or None)
        limit = max(1, options["limit"])
        watch = bool(options["watch"])
        poll_seconds = max(1.0, float(options["poll_seconds"]))
        self.stdout.write(
            self.style.SUCCESS(
                f"Automation worker {worker.worker_id} started "
                f"({'continuous' if watch else 'single batch'}, limit={limit})"
            )
        )

        while True:
            close_old_connections()
            try:
                worker = WorkerService.register_or_heartbeat(worker.worker_id)
                processed = self._process_batch(worker, limit)
                if processed or not watch:
                    self.stdout.write(
                        self.style.SUCCESS(f"Processed {processed} job(s) as {worker.worker_id}")
                    )
            except Exception as exc:  # noqa: BLE001 — a worker must survive a bad poll
                logger.exception("automation_worker_poll_failed worker_id=%s", worker.worker_id)
                self.stderr.write(
                    self.style.ERROR(
                        f"Worker poll failed ({type(exc).__name__}): {exc}"
                    )
                )
                close_old_connections()
                if not watch:
                    raise

            if not watch:
                return
            time.sleep(poll_seconds)

    @staticmethod
    def _process_batch(worker, limit: int) -> int:
        AutomationJob.objects.filter(
            status=JobStatus.SCHEDULED,
            scheduled_at__lte=timezone.now(),
            deleted_at__isnull=True,
        ).update(status=JobStatus.QUEUED, updated_at=timezone.now())

        paused_queues = set(
            AutomationQueue.objects.filter(is_paused=True, deleted_at__isnull=True).values_list("id", flat=True)
        )

        priority_cases = [
            When(priority=p, then=Value(order)) for p, order in PRIORITY_ORDER.items()
        ]
        jobs = (
            AutomationJob.objects.filter(
                status__in=[JobStatus.QUEUED, JobStatus.RETRYING],
                deleted_at__isnull=True,
            )
            .exclude(queue_id__in=paused_queues)
            .annotate(
                priority_order=Case(*priority_cases, default=Value(99), output_field=IntegerField())
            )
            .order_by("priority_order", "created_at")[:limit]
        )

        processed = 0
        for job in jobs:
            WorkerService.set_busy(worker, job)
            execution = JobExecutor.run(job, worker=worker)
            processed += 1

            if job.created_by_id:
                if execution.status == JobStatus.COMPLETED:
                    NotificationService.notify(
                        job=job,
                        user=job.created_by,
                        notification_type=NotificationType.COMPLETED,
                        title=f"Job completed: {job.name}",
                    )
                elif execution.status == JobStatus.FAILED:
                    NotificationService.notify(
                        job=job,
                        user=job.created_by,
                        notification_type=NotificationType.FAILED,
                        title=f"Job failed: {job.name}",
                        body=execution.error_message,
                    )
                elif execution.status == JobStatus.WAITING_APPROVAL:
                    NotificationService.notify(
                        job=job,
                        user=job.created_by,
                        notification_type=NotificationType.APPROVAL_REQUIRED,
                        title=f"Approval required: {job.name}",
                    )

            WorkerService.set_idle(worker)

        worker.last_heartbeat = timezone.now()
        worker.save(update_fields=["last_heartbeat", "updated_at"])
        return processed
