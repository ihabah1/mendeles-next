"""Structured logging for automation jobs."""

from automation.domain.enums import LogLevel
from automation.infrastructure.models import AutomationExecution, AutomationJob, AutomationLog


class AutomationLogService:
    @staticmethod
    def log(
        job: AutomationJob,
        message: str,
        *,
        level: str = LogLevel.INFO,
        execution: AutomationExecution | None = None,
        metadata: dict | None = None,
    ) -> AutomationLog:
        return AutomationLog.objects.create(
            job=job,
            execution=execution,
            level=level,
            message=message,
            metadata=metadata or {},
        )
