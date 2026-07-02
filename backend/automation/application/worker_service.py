"""Worker registration and heartbeat."""

import socket
import uuid

from django.utils import timezone

from automation.domain.enums import WorkerStatus
from automation.infrastructure.models import AutomationWorker


class WorkerService:
    @staticmethod
    def register_or_heartbeat(worker_id: str | None = None) -> AutomationWorker:
        wid = worker_id or f"worker-{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
        worker, _ = AutomationWorker.objects.get_or_create(
            worker_id=wid,
            defaults={
                "hostname": socket.gethostname(),
                "status": WorkerStatus.IDLE,
                "started_at": timezone.now(),
            },
        )
        worker.last_heartbeat = timezone.now()
        worker.last_activity = timezone.now()
        if not worker.started_at:
            worker.started_at = timezone.now()
        worker.save(update_fields=["last_heartbeat", "last_activity", "started_at", "updated_at"])
        return worker

    @staticmethod
    def set_busy(worker: AutomationWorker, job=None) -> None:
        worker.status = WorkerStatus.BUSY
        worker.current_job = job
        worker.last_activity = timezone.now()
        worker.save(update_fields=["status", "current_job", "last_activity", "updated_at"])

    @staticmethod
    def set_idle(worker: AutomationWorker) -> None:
        worker.status = WorkerStatus.IDLE
        worker.current_job = None
        worker.last_activity = timezone.now()
        worker.save(update_fields=["status", "current_job", "last_activity", "updated_at"])

    @staticmethod
    def list_workers():
        return AutomationWorker.objects.filter(deleted_at__isnull=True).select_related("current_job")
