"""Automation job lifecycle service."""

import uuid
from copy import deepcopy

from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from django.utils import timezone

from audit.application.audit_service import AuditService
from automation.application.executor import JobExecutor
from automation.application.log_service import AutomationLogService
from automation.application.notification_service import NotificationService
from automation.domain.enums import (
    PRIORITY_ORDER,
    PUBLISHING_JOB_TYPES,
    JobPriority,
    JobStatus,
    JobType,
    NotificationType,
    ScheduleType,
    StepStatus,
)
from automation.infrastructure.models import (
    AutomationJob,
    AutomationJobStep,
    AutomationQueue,
    AutomationSchedule,
)
from core.exceptions.base import NotFoundError, ValidationError


def _client_meta(request):
    ip = request.META.get("REMOTE_ADDR") if request else None
    ua = request.META.get("HTTP_USER_AGENT", "") if request else ""
    return ip, ua


class QueueService:
    @staticmethod
    def get_default_queue(tenant_id) -> AutomationQueue:
        queue = AutomationQueue.objects.filter(
            tenant_id=tenant_id,
            is_default=True,
            deleted_at__isnull=True,
        ).first()
        if not queue:
            raise ValidationError("Default automation queue not configured. Run seed_automation.")
        return queue


class JobService:
    @staticmethod
    def list_jobs(tenant_id, **filters):
        qs = AutomationJob.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).select_related(
            "queue", "created_by", "workflow", "template"
        )
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])
        if filters.get("job_type"):
            qs = qs.filter(job_type=filters["job_type"])
        if filters.get("q"):
            q = filters["q"]
            qs = qs.filter(name__icontains=q)
        priority_cases = [
            When(priority=p, then=Value(order)) for p, order in PRIORITY_ORDER.items()
        ]
        qs = qs.annotate(
            priority_order=Case(*priority_cases, default=Value(99), output_field=IntegerField())
        ).order_by("priority_order", "-created_at")
        return qs

    @staticmethod
    def get_job(tenant_id, job_id: uuid.UUID) -> AutomationJob:
        try:
            return AutomationJob.objects.select_related("queue", "created_by", "workflow", "template").get(
                id=job_id,
                tenant_id=tenant_id,
                deleted_at__isnull=True,
            )
        except AutomationJob.DoesNotExist:
            raise NotFoundError("Job not found.")

    @staticmethod
    @transaction.atomic
    def create_job(tenant_id, user, data: dict, *, request=None) -> AutomationJob:
        job_type = data.get("job_type", "")
        if job_type not in {c.value for c in JobType}:
            raise ValidationError("Invalid job_type.")

        queue_id = data.get("queue_id")
        if queue_id:
            try:
                queue = AutomationQueue.objects.get(
                    id=queue_id, tenant_id=tenant_id, deleted_at__isnull=True
                )
            except AutomationQueue.DoesNotExist:
                raise ValidationError("Queue not found.")
        else:
            queue = QueueService.get_default_queue(tenant_id)

        requires_approval = data.get("requires_approval")
        if requires_approval is None:
            requires_approval = job_type in {t.value for t in PUBLISHING_JOB_TYPES}

        job = AutomationJob.objects.create(
            tenant_id=tenant_id,
            queue=queue,
            workflow_id=data.get("workflow_id"),
            template_id=data.get("template_id"),
            name=data.get("name") or JobType(job_type).label,
            job_type=job_type,
            status=JobStatus.QUEUED,
            priority=data.get("priority", JobPriority.NORMAL),
            config=data.get("config") or {},
            requires_approval=requires_approval,
            auto_publish_enabled=bool(data.get("auto_publish_enabled", False)),
            scheduled_at=data.get("scheduled_at"),
            max_retries=int(data.get("max_retries", 3)),
            created_by=user,
            parent_job_id=data.get("parent_job_id"),
        )

        steps = data.get("steps") or []
        for index, step in enumerate(steps):
            AutomationJobStep.objects.create(
                job=job,
                step_order=index,
                name=step.get("name", f"Step {index + 1}"),
                step_type=step.get("step_type", ""),
                requires_approval=bool(step.get("requires_approval", False)),
                config=step.get("config") or {},
            )

        schedule_data = data.get("schedule")
        if schedule_data:
            SchedulerService.create_schedule(job, schedule_data)
            if schedule_data.get("schedule_type") != ScheduleType.NOW:
                job.status = JobStatus.SCHEDULED
                job.save(update_fields=["status", "updated_at"])

        AutomationLogService.log(job, "Job created")
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_created",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )
        return job

    @staticmethod
    def update_job(tenant_id, user, job_id: uuid.UUID, data: dict, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status in {JobStatus.RUNNING, JobStatus.RETRYING}:
            raise ValidationError("Cannot update a running job.")

        for field in ("name", "priority", "config", "requires_approval", "auto_publish_enabled", "scheduled_at"):
            if field in data:
                setattr(job, field, data[field])
        job.save()
        AutomationLogService.log(job, "Job updated")
        return job

    @staticmethod
    def delete_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> None:
        job = JobService.get_job(tenant_id, job_id)
        if job.status == JobStatus.RUNNING:
            raise ValidationError("Cannot delete a running job.")
        job.soft_delete()
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_deleted",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )

    @staticmethod
    def queue_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status not in {JobStatus.QUEUED, JobStatus.SCHEDULED, JobStatus.PAUSED, JobStatus.FAILED}:
            raise ValidationError(f"Cannot queue job in status '{job.status}'.")
        job.status = JobStatus.QUEUED
        job.error_message = ""
        job.save(update_fields=["status", "error_message", "updated_at"])
        AutomationLogService.log(job, "Job queued")
        return job

    @staticmethod
    def pause_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status not in {
            JobStatus.QUEUED,
            JobStatus.SCHEDULED,
            JobStatus.RETRYING,
            JobStatus.RUNNING,
        }:
            raise ValidationError("Only queued, scheduled, or running jobs can be paused.")
        job.status = JobStatus.PAUSED
        job.save(update_fields=["status", "updated_at"])
        AutomationLogService.log(job, "Job paused")
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_paused",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )
        return job

    @staticmethod
    def resume_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status != JobStatus.PAUSED:
            raise ValidationError("Only paused jobs can be resumed.")
        job.status = JobStatus.QUEUED
        job.save(update_fields=["status", "updated_at"])
        AutomationLogService.log(job, "Job resumed")
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_resumed",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )
        return job

    @staticmethod
    def cancel_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status in {JobStatus.COMPLETED, JobStatus.CANCELLED}:
            raise ValidationError("Job already finished.")
        job.status = JobStatus.CANCELLED
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "finished_at", "updated_at"])
        AutomationLogService.log(job, "Job cancelled")
        if user:
            NotificationService.notify(
                job=job,
                user=user,
                notification_type=NotificationType.CANCELLED,
                title=f"Job cancelled: {job.name}",
            )
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_cancelled",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )
        return job

    @staticmethod
    def retry_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status not in {JobStatus.FAILED, JobStatus.CANCELLED}:
            raise ValidationError("Only failed or cancelled jobs can be retried.")
        if job.retry_count >= job.max_retries:
            raise ValidationError("Maximum retry count reached.")
        job.retry_count += 1
        job.status = JobStatus.RETRYING
        job.error_message = ""
        job.finished_at = None
        job.progress_percent = 0
        job.save(
            update_fields=[
                "retry_count",
                "status",
                "error_message",
                "finished_at",
                "progress_percent",
                "updated_at",
            ]
        )
        job.status = JobStatus.QUEUED
        job.save(update_fields=["status", "updated_at"])
        AutomationLogService.log(job, f"Job retry #{job.retry_count}")
        return job

    @staticmethod
    def duplicate_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        steps = [
            {
                "name": s.name,
                "step_type": s.step_type,
                "requires_approval": s.requires_approval,
                "config": deepcopy(s.config),
            }
            for s in job.steps.filter(deleted_at__isnull=True).order_by("step_order")
        ]
        return JobService.create_job(
            tenant_id,
            user,
            {
                "name": f"{job.name} (copy)",
                "job_type": job.job_type,
                "queue_id": str(job.queue_id),
                "workflow_id": str(job.workflow_id) if job.workflow_id else None,
                "template_id": str(job.template_id) if job.template_id else None,
                "priority": job.priority,
                "config": deepcopy(job.config),
                "requires_approval": job.requires_approval,
                "auto_publish_enabled": job.auto_publish_enabled,
                "steps": steps,
            },
            request=request,
        )

    @staticmethod
    def approve_job(tenant_id, user, job_id: uuid.UUID, *, request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status != JobStatus.WAITING_APPROVAL:
            raise ValidationError("Job is not waiting for approval.")

        current_step = job.steps.filter(status=StepStatus.WAITING_APPROVAL).order_by("step_order").first()
        if current_step:
            current_step.status = StepStatus.PENDING
            current_step.save(update_fields=["status", "updated_at"])

        job.status = JobStatus.QUEUED
        job.save(update_fields=["status", "updated_at"])
        AutomationLogService.log(job, "Job approved")
        ip, ua = _client_meta(request)
        AuditService.log(
            action="automation.job_approved",
            user=user,
            tenant_id=tenant_id,
            resource_type="automation_job",
            resource_id=job.id,
            ip_address=ip,
            user_agent=ua,
        )
        return job

    @staticmethod
    def reject_job(tenant_id, user, job_id: uuid.UUID, *, reason: str = "", request=None) -> AutomationJob:
        job = JobService.get_job(tenant_id, job_id)
        if job.status != JobStatus.WAITING_APPROVAL:
            raise ValidationError("Job is not waiting for approval.")
        job.status = JobStatus.CANCELLED
        job.error_message = reason or "Rejected by user"
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
        AutomationLogService.log(job, f"Job rejected: {job.error_message}")
        return job


class SchedulerService:
    @staticmethod
    def create_schedule(job: AutomationJob, data: dict) -> AutomationSchedule:
        schedule_type = data.get("schedule_type", ScheduleType.NOW)
        next_run = data.get("next_run_at") or job.scheduled_at
        if schedule_type == ScheduleType.NOW:
            next_run = timezone.now()
        return AutomationSchedule.objects.create(
            job=job,
            schedule_type=schedule_type,
            timezone=data.get("timezone", "UTC"),
            cron_expression=data.get("cron_expression", ""),
            interval_value=data.get("interval_value"),
            next_run_at=next_run,
            is_active=bool(data.get("is_active", True)),
        )
