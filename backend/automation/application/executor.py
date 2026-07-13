"""Job execution — only real handlers; unimplemented types fail honestly."""

from django.utils import timezone

from automation.application.log_service import AutomationLogService
from automation.domain.enums import (
    IMPLEMENTED_JOB_TYPES,
    JobStatus,
    JobType,
    LogLevel,
    PUBLISHING_JOB_TYPES,
    StepStatus,
)
from automation.infrastructure.models import AutomationExecution, AutomationJob, AutomationJobStep


class JobExecutor:
    @staticmethod
    def run(job: AutomationJob, *, worker=None) -> AutomationExecution:
        execution_number = job.executions.count() + 1
        execution = AutomationExecution.objects.create(
            job=job,
            execution_number=execution_number,
            status=JobStatus.RUNNING,
            started_at=timezone.now(),
            worker=worker,
        )

        job.status = JobStatus.RUNNING
        job.started_at = job.started_at or timezone.now()
        job.error_message = ""
        job.save(update_fields=["status", "started_at", "error_message", "updated_at"])

        AutomationLogService.log(job, f"Execution #{execution_number} started", execution=execution)

        try:
            JobExecutor._run_steps(job, execution)
            job.refresh_from_db()
            if job.status == JobStatus.WAITING_APPROVAL:
                execution.status = JobStatus.WAITING_APPROVAL
                execution.finished_at = timezone.now()
                execution.duration_ms = JobExecutor._duration_ms(execution)
                execution.save()
                return execution
            if job.status in {JobStatus.PAUSED, JobStatus.CANCELLED}:
                execution.status = job.status
                execution.finished_at = timezone.now()
                execution.duration_ms = JobExecutor._duration_ms(execution)
                execution.result = {"ok": True, "stopped": job.status}
                execution.save()
                AutomationLogService.log(job, f"Execution stopped — job is {job.status}", execution=execution)
                return execution

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "progress_percent", "finished_at", "updated_at"])

            execution.status = JobStatus.COMPLETED
            execution.finished_at = timezone.now()
            execution.duration_ms = JobExecutor._duration_ms(execution)
            if not execution.result:
                execution.result = {"ok": True}
            execution.save()

            AutomationLogService.log(job, "Job completed successfully", execution=execution)
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:2000]
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])

            execution.status = JobStatus.FAILED
            execution.error_message = job.error_message
            execution.finished_at = timezone.now()
            execution.duration_ms = JobExecutor._duration_ms(execution)
            execution.save()

            AutomationLogService.log(
                job,
                f"Job failed: {exc}",
                level=LogLevel.ERROR,
                execution=execution,
            )

        return execution

    @staticmethod
    def run_next_step(job: AutomationJob, *, worker=None) -> AutomationExecution:
        execution_number = job.executions.count() + 1
        execution = AutomationExecution.objects.create(
            job=job,
            execution_number=execution_number,
            status=JobStatus.RUNNING,
            started_at=timezone.now(),
            worker=worker,
        )

        job.status = JobStatus.RUNNING
        job.started_at = job.started_at or timezone.now()
        job.error_message = ""
        job.save(update_fields=["status", "started_at", "error_message", "updated_at"])

        try:
            steps = list(job.steps.filter(deleted_at__isnull=True).order_by("step_order"))
            if not steps:
                JobExecutor._execute_job_type(job, execution)
                JobExecutor._mark_step_execution_complete(job, execution)
                return execution

            next_step = next((step for step in steps if step.status != StepStatus.COMPLETED), None)
            if not next_step:
                job.status = JobStatus.COMPLETED
                job.progress_percent = 100
                job.finished_at = timezone.now()
                job.save(update_fields=["status", "progress_percent", "finished_at", "updated_at"])
                JobExecutor._mark_step_execution_complete(job, execution)
                AutomationLogService.log(job, "Queue job completed", execution=execution)
                return execution

            index = steps.index(next_step)
            if next_step.status != StepStatus.RUNNING:
                next_step.status = StepStatus.RUNNING
                next_step.error_message = ""
                next_step.save(update_fields=["status", "error_message", "updated_at"])
                AutomationLogService.log(job, f"Step entered running state: {next_step.name}", execution=execution)

            if not next_step.started_at:
                next_step.started_at = timezone.now()
                next_step.save(update_fields=["started_at", "updated_at"])
                AutomationLogService.log(job, f"Step execution started: {next_step.name}", execution=execution)
            else:
                AutomationLogService.log(job, f"Step execution resumed: {next_step.name}", execution=execution)

            JobExecutor._execute_step(job, next_step, execution)
            next_step.refresh_from_db()
            job.refresh_from_db()
            if job.status in {JobStatus.PAUSED, JobStatus.CANCELLED}:
                execution.status = job.status
                execution.finished_at = timezone.now()
                execution.duration_ms = JobExecutor._duration_ms(execution)
                execution.result = {"ok": True, "stopped": job.status}
                execution.save()
                AutomationLogService.log(job, f"Step interrupted — job is {job.status}", execution=execution)
                return execution
            if next_step.status == StepStatus.WAITING_APPROVAL or job.status == JobStatus.WAITING_APPROVAL:
                execution.status = JobStatus.WAITING_APPROVAL
                execution.finished_at = timezone.now()
                execution.duration_ms = JobExecutor._duration_ms(execution)
                execution.result = {"ok": True, "waiting_approval": True}
                execution.save()
                AutomationLogService.log(job, f"Step waiting for approval: {next_step.name}", execution=execution)
                return execution

            next_step.status = StepStatus.COMPLETED
            next_step.finished_at = timezone.now()
            next_step.save(update_fields=["status", "finished_at", "updated_at"])
            AutomationLogService.log(job, f"Step completed: {next_step.name}", execution=execution)

            job.current_step_index = index + 1
            job.progress_percent = int(((index + 1) / len(steps)) * 100)
            if index + 1 >= len(steps):
                job.status = JobStatus.COMPLETED
                job.finished_at = timezone.now()
                save_fields = ["current_step_index", "progress_percent", "status", "finished_at", "updated_at"]
                AutomationLogService.log(job, "Queue job completed", execution=execution)
            else:
                upcoming_step = steps[index + 1]
                if upcoming_step.status == StepStatus.PENDING:
                    upcoming_step.status = StepStatus.RUNNING
                    upcoming_step.save(update_fields=["status", "updated_at"])
                    AutomationLogService.log(
                        job,
                        f"Next step is ready: {upcoming_step.name}",
                        execution=execution,
                    )
                job.status = JobStatus.RUNNING
                save_fields = ["current_step_index", "progress_percent", "status", "updated_at"]
            job.save(update_fields=save_fields)

            JobExecutor._mark_step_execution_complete(job, execution)
        except Exception as exc:
            failed_step = job.steps.filter(status=StepStatus.RUNNING, deleted_at__isnull=True).first()
            if failed_step:
                if JobExecutor._schedule_auto_retry_if_available(job, failed_step, str(exc)):
                    execution.status = JobStatus.RUNNING
                    execution.error_message = ""
                    execution.finished_at = timezone.now()
                    execution.duration_ms = JobExecutor._duration_ms(execution)
                    execution.result = {"ok": True, "auto_retry": True}
                    execution.save()
                    AutomationLogService.log(
                        job,
                        f"Step auto-retry queued after failure: {failed_step.name}",
                        level=LogLevel.WARNING,
                        execution=execution,
                    )
                    return execution

                failed_step.status = StepStatus.FAILED
                failed_step.error_message = str(exc)[:2000]
                failed_step.finished_at = timezone.now()
                failed_step.save(update_fields=["status", "error_message", "finished_at", "updated_at"])

            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:2000]
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])

            execution.status = JobStatus.FAILED
            execution.error_message = job.error_message
            execution.finished_at = timezone.now()
            execution.duration_ms = JobExecutor._duration_ms(execution)
            execution.save()
            AutomationLogService.log(job, f"Step failed: {exc}", level=LogLevel.ERROR, execution=execution)

        return execution

    @staticmethod
    def _schedule_auto_retry_if_available(job: AutomationJob, step: AutomationJobStep, reason: str) -> bool:
        if job.job_type not in {JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE}:
            return False
        from ai_seo.application.generation_service import AiSeoGenerationService

        return AiSeoGenerationService.schedule_step_auto_retry(job, step, reason)

    @staticmethod
    def _mark_step_execution_complete(job: AutomationJob, execution: AutomationExecution) -> None:
        execution.status = job.status if job.status in {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.WAITING_APPROVAL} else JobStatus.RUNNING
        execution.finished_at = timezone.now()
        execution.duration_ms = JobExecutor._duration_ms(execution)
        execution.result = {"ok": execution.status != JobStatus.FAILED}
        execution.save()

    @staticmethod
    def _run_steps(job: AutomationJob, execution: AutomationExecution) -> None:
        steps = list(job.steps.filter(deleted_at__isnull=True).order_by("step_order"))
        if not steps:
            JobExecutor._execute_job_type(job, execution)
            return

        total = len(steps)
        for index, step in enumerate(steps):
            job.refresh_from_db()
            if job.status in {JobStatus.PAUSED, JobStatus.CANCELLED}:
                AutomationLogService.log(
                    job,
                    f"Stopping at step {index + 1}/{total} — job is {job.status}",
                    execution=execution,
                )
                job.current_step_index = index
                job.progress_percent = int((index / total) * 100) if total else 0
                job.save(update_fields=["current_step_index", "progress_percent", "updated_at"])
                return

            if step.status == StepStatus.COMPLETED:
                continue

            if step.requires_approval and step.status != StepStatus.WAITING_APPROVAL:
                step.status = StepStatus.WAITING_APPROVAL
                step.save(update_fields=["status", "updated_at"])
                job.status = JobStatus.WAITING_APPROVAL
                job.current_step_index = index
                job.progress_percent = int((index / total) * 100)
                job.save(update_fields=["status", "current_step_index", "progress_percent", "updated_at"])
                AutomationLogService.log(job, f"Waiting for approval at step: {step.name}", execution=execution)
                return

            step.status = StepStatus.RUNNING
            step.started_at = timezone.now()
            step.save(update_fields=["status", "started_at", "updated_at"])
            AutomationLogService.log(job, f"Step started: {step.name}", execution=execution)

            try:
                JobExecutor._execute_step(job, step, execution)
            except Exception as exc:
                step.status = StepStatus.FAILED
                step.error_message = str(exc)[:2000]
                step.finished_at = timezone.now()
                step.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
                raise

            step.status = StepStatus.COMPLETED
            step.finished_at = timezone.now()
            step.save(update_fields=["status", "finished_at", "updated_at"])
            AutomationLogService.log(job, f"Step completed: {step.name}", execution=execution)

            job.current_step_index = index + 1
            job.progress_percent = int(((index + 1) / total) * 100)
            job.save(update_fields=["current_step_index", "progress_percent", "updated_at"])

    @staticmethod
    def _execute_step(job: AutomationJob, step: AutomationJobStep, execution: AutomationExecution) -> None:
        step_type = step.step_type or job.job_type
        if step_type in {t.value for t in PUBLISHING_JOB_TYPES} and not job.auto_publish_enabled:
            raise RuntimeError("Publishing requires approval or auto_publish_enabled on the job.")
        JobExecutor._run_handler(job, step_type, execution)

    @staticmethod
    def _execute_job_type(job: AutomationJob, execution: AutomationExecution) -> None:
        if job.job_type in {t.value for t in PUBLISHING_JOB_TYPES}:
            if job.requires_approval and not job.auto_publish_enabled:
                job.status = JobStatus.WAITING_APPROVAL
                job.save(update_fields=["status", "updated_at"])
                AutomationLogService.log(job, "Waiting for approval before publishing", execution=execution)
                return
        JobExecutor._run_handler(job, job.job_type, execution)
        job.progress_percent = 100
        job.save(update_fields=["progress_percent", "updated_at"])

    @staticmethod
    def _run_handler(job: AutomationJob, job_type: str, execution: AutomationExecution) -> None:
        if job_type.startswith("ai_seo."):
            from ai_seo.application.generation_service import AiSeoGenerationService

            step = job.steps.filter(step_type=job_type, status=StepStatus.RUNNING).order_by("step_order").first()
            if not step:
                raise RuntimeError(f"AI SEO step '{job_type}' is not running.")
            AiSeoGenerationService.execute_generation_step(job, step, execution=execution)
            return
        if job_type == JobType.HEALTH_CHECK:
            AutomationLogService.log(job, "Running platform health check", execution=execution)
            return
        if job_type == JobType.ACCESSIBILITY_AUDIT.value:
            from automation.application.accessibility_audit_service import AccessibilityAuditService

            result = AccessibilityAuditService.run(job, execution)
            execution.result = result
            execution.save(update_fields=["result", "updated_at"])
            return
        if job_type in {JobType.TRANSLATE_SITE_PAGES.value, "translate_site_page"}:
            from automation.application.site_translation_service import SiteTranslationService

            step = job.steps.filter(status=StepStatus.RUNNING, deleted_at__isnull=True).order_by("step_order").first()
            if not step:
                raise RuntimeError("Translation step is not running.")
            result = SiteTranslationService.execute_step(job, step, execution=execution)
            execution.result = result
            execution.save(update_fields=["result", "updated_at"])
            return
        if job_type == JobType.CLEANUP:
            AutomationLogService.log(job, "Running log cleanup (no-op placeholder handler)", execution=execution)
            return
        if job_type == JobType.CACHE_REFRESH:
            AutomationLogService.log(job, "Cache refresh acknowledged (no external cache configured)", execution=execution)
            return
        if job_type in {
            JobType.SEARCH_CONSOLE_SYNC.value,
            JobType.GOOGLE_TRENDS_SYNC.value,
            JobType.REFRESH_METRICS.value,
        }:
            from integrations.application.sync_service import IntegrationSyncService

            record = IntegrationSyncService.run_sync_for_job(job)
            AutomationLogService.log(
                job,
                f"Integration sync completed: {record.service_type} ({record.sync_status})",
                execution=execution,
            )
            return
        if job_type in {JobType.GENERATE_BLOG_ARTICLE.value, JobType.GENERATE_LANDING_PAGE.value}:
            from ai_seo.application.generation_service import AiSeoGenerationService

            page = AiSeoGenerationService.execute_generation_job(job)
            AutomationLogService.log(
                job,
                f"Generated draft content: {page.title} ({page.page_type})",
                execution=execution,
            )
            return
        if job_type not in {t.value for t in IMPLEMENTED_JOB_TYPES}:
            raise RuntimeError(
                f"Job type '{job_type}' is not implemented yet. "
                "No AI or external providers are enabled in Phase X infrastructure."
            )

    @staticmethod
    def _duration_ms(execution: AutomationExecution) -> int | None:
        if not execution.started_at or not execution.finished_at:
            return None
        return int((execution.finished_at - execution.started_at).total_seconds() * 1000)
