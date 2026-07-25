"""Recurring cron: every X hours pick a random published campaign and republish now."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.utils import timezone

from automation.application.job_service import JobService
from automation.application.log_service import AutomationLogService
from automation.domain.enums import JobStatus, JobType
from automation.infrastructure.models import AutomationJob
from social.application.campaign_service import CampaignService
from social.domain.enums import CampaignStatus
from social.infrastructure.models import SocialCampaign


class RandomRepublishCronService:
    JOB_TYPE = JobType.SOCIAL_RANDOM_REPUBLISH.value
    CHAIN_KEY = "social_random_republish_v1"

    @classmethod
    def status(cls, tenant_id) -> dict[str, Any]:
        active = (
            AutomationJob.objects.filter(
                tenant_id=tenant_id,
                job_type=cls.JOB_TYPE,
                deleted_at__isnull=True,
                status__in=[JobStatus.QUEUED, JobStatus.SCHEDULED, JobStatus.RUNNING, JobStatus.RETRYING],
            )
            .order_by("-created_at")
            .first()
        )
        recent = (
            AutomationJob.objects.filter(
                tenant_id=tenant_id,
                job_type=cls.JOB_TYPE,
                deleted_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )
        cfg = (active or recent).config if (active or recent) else {}
        return {
            "enabled": bool(active),
            "job_id": str(active.id) if active else None,
            "status": active.status if active else None,
            "interval_hours": int((cfg or {}).get("interval_hours") or 6),
            "campaign_ids": list((cfg or {}).get("campaign_ids") or []),
            "next_run_at": active.scheduled_at.isoformat() if active and active.scheduled_at else None,
            "last_job_id": str(recent.id) if recent else None,
            "last_status": recent.status if recent else None,
            "last_error": (recent.error_message if recent else "") or "",
        }

    @classmethod
    def start(
        cls,
        tenant_id,
        user,
        *,
        interval_hours: int = 6,
        campaign_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        hours = max(1, min(int(interval_hours or 6), 24 * 30))
        ids = [str(x) for x in (campaign_ids or []) if x]
        if not ids:
            ids = [
                str(cid)
                for cid in SocialCampaign.objects.filter(
                    tenant_id=tenant_id,
                    deleted_at__isnull=True,
                    status__in=[CampaignStatus.PUBLISHED, CampaignStatus.SCHEDULED],
                )
                .order_by("-published_at", "-created_at")
                .values_list("id", flat=True)[:50]
            ]
        if not ids:
            return {"enabled": False, "error": "אין קמפיינים שפורסמו לבחירה אקראית."}

        cls.stop(tenant_id, user)
        now = timezone.now()
        job = JobService.create_job(
            tenant_id,
            user,
            {
                "name": f"Random campaign republish every {hours}h",
                "job_type": cls.JOB_TYPE,
                "requires_approval": False,
                "scheduled_at": now,
                "config": {
                    "chain_key": cls.CHAIN_KEY,
                    "interval_hours": hours,
                    "campaign_ids": ids,
                },
            },
        )
        # Run ASAP via the worker (scheduled_at <= now → queued on next poll).
        job.status = JobStatus.SCHEDULED
        job.save(update_fields=["status", "updated_at"])
        return cls.status(tenant_id)

    @classmethod
    def stop(cls, tenant_id, user=None) -> dict[str, Any]:
        qs = AutomationJob.objects.filter(
            tenant_id=tenant_id,
            job_type=cls.JOB_TYPE,
            deleted_at__isnull=True,
            status__in=[JobStatus.QUEUED, JobStatus.SCHEDULED, JobStatus.RUNNING, JobStatus.RETRYING, JobStatus.PAUSED],
        )
        for job in qs:
            job.status = JobStatus.CANCELLED
            job.error_message = "Random republish cron stopped"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
        return cls.status(tenant_id)

    @classmethod
    def execute(cls, job: AutomationJob, *, execution=None) -> dict[str, Any]:
        config = dict(job.config or {})
        ids = list(config.get("campaign_ids") or [])
        hours = max(1, min(int(config.get("interval_hours") or 6), 24 * 30))
        result = CampaignService.batch_republish(
            job.tenant_id,
            ids,
            strategy="random_one",
            schedule=False,
        )
        AutomationLogService.log(
            job,
            f"Random republish: order={result.get('order')} error={result.get('error') or ''}",
            execution=execution,
        )
        if execution is not None:
            execution.result = result
            execution.save(update_fields=["result", "updated_at"])

        # Chain next run only if this job was not cancelled mid-flight.
        job.refresh_from_db()
        if job.status == JobStatus.CANCELLED:
            return result
        if config.get("next_recurring_job_id"):
            return result

        next_run_at = timezone.now() + timedelta(hours=hours)
        next_config = {
            "chain_key": cls.CHAIN_KEY,
            "interval_hours": hours,
            "campaign_ids": ids,
        }
        next_job = JobService.create_job(
            job.tenant_id,
            job.created_by,
            {
                "name": job.name,
                "job_type": cls.JOB_TYPE,
                "queue_id": str(job.queue_id),
                "requires_approval": False,
                "scheduled_at": next_run_at,
                "parent_job_id": str(job.id),
                "config": next_config,
            },
        )
        next_job.status = JobStatus.SCHEDULED
        next_job.save(update_fields=["status", "updated_at"])
        job.config = {
            **config,
            "next_recurring_job_id": str(next_job.id),
            "next_recurring_run_at": next_run_at.isoformat(),
            "last_result": {
                "order": result.get("order"),
                "error": result.get("error") or "",
            },
        }
        job.save(update_fields=["config", "updated_at"])
        AutomationLogService.log(
            job,
            f"Next random republish scheduled at {next_run_at.isoformat()}",
            execution=execution,
        )
        return result
