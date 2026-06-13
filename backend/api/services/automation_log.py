"""Automation job logging."""
from admin_panel.portal.models import AutomationLog


def log_automation(
    job: str,
    message: str,
    *,
    level: str = AutomationLog.Level.INFO,
    details: dict | None = None,
    duration_ms: int | None = None,
) -> AutomationLog:
    return AutomationLog.objects.create(
        job=job,
        level=level,
        message=message[:500],
        details=details or {},
        duration_ms=duration_ms,
    )


def recent_automation_logs(*, job: str = '', limit: int = 50) -> list[dict]:
    qs = AutomationLog.objects.all()
    if job:
        qs = qs.filter(job=job)
    qs = qs.order_by('-created_at')[:limit]
    return [
        {
            'id': row.id,
            'job': row.job,
            'level': row.level,
            'message': row.message,
            'details': row.details,
            'durationMs': row.duration_ms,
            'createdAt': row.created_at.isoformat(),
        }
        for row in qs
    ]
