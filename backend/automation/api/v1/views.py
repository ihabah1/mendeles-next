from rest_framework.response import Response
from rest_framework.views import APIView

from automation.application.dashboard_service import DashboardService
from automation.application.job_service import JobService
from automation.application.notification_service import NotificationService
from automation.application.worker_service import WorkerService
from automation.domain.enums import JobPriority, JobStatus, JobType
from automation.infrastructure.models import AutomationJob
from core.exceptions.base import ForbiddenError
from core.pagination import StandardPagination
from core.permissions.base import HasPermission


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


def _serialize_job(job: AutomationJob, *, detail: bool = False) -> dict:
    steps_qs = job.steps.filter(deleted_at__isnull=True).order_by("step_order")
    completed_steps = steps_qs.filter(status="completed").count()
    failed_steps = steps_qs.filter(status="failed").count()
    total_steps = steps_qs.count()

    data = {
        "id": str(job.id),
        "name": job.name,
        "job_type": job.job_type,
        "status": job.status,
        "priority": job.priority,
        "progress_percent": job.progress_percent,
        "current_step_index": job.current_step_index,
        "queue_id": str(job.queue_id),
        "requires_approval": job.requires_approval,
        "auto_publish_enabled": job.auto_publish_enabled,
        "retry_count": job.retry_count,
        "max_retries": job.max_retries,
        "error_message": job.error_message,
        "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "created_by": job.created_by.email if job.created_by_id else None,
        "completed_tasks": completed_steps,
        "failed_tasks": failed_steps,
        "remaining_tasks": max(0, total_steps - completed_steps - failed_steps),
        "total_tasks": total_steps,
    }
    if detail:
        data["config"] = job.config
        data["steps"] = [
            {
                "id": str(s.id),
                "step_order": s.step_order,
                "name": s.name,
                "step_type": s.step_type,
                "status": s.status,
                "requires_approval": s.requires_approval,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "finished_at": s.finished_at.isoformat() if s.finished_at else None,
                "error_message": s.error_message,
            }
            for s in steps_qs
        ]
        data["executions"] = [
            {
                "id": str(e.id),
                "execution_number": e.execution_number,
                "status": e.status,
                "started_at": e.started_at.isoformat() if e.started_at else None,
                "finished_at": e.finished_at.isoformat() if e.finished_at else None,
                "duration_ms": e.duration_ms,
                "error_message": e.error_message,
                "result": e.result,
            }
            for e in job.executions.order_by("-execution_number")[:20]
        ]
        data["logs"] = [
            {
                "id": str(log.id),
                "level": log.level,
                "message": log.message,
                "created_at": log.created_at.isoformat(),
            }
            for log in job.logs.order_by("-created_at")[:50]
        ]
    return data


def _parse_filters(request) -> dict:
    filters: dict = {}
    if request.query_params.get("status"):
        filters["status"] = request.query_params["status"]
    if request.query_params.get("job_type"):
        filters["job_type"] = request.query_params["job_type"]
    if request.query_params.get("q"):
        filters["q"] = request.query_params["q"]
    return filters


class AutomationJobListView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        _check(request, self, "automation.view")
        filters = _parse_filters(request)
        qs = JobService.list_jobs(request.user.default_tenant_id, **filters)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response([_serialize_job(job) for job in page])

    def post(self, request):
        _check(request, self, "automation.create")
        job = JobService.create_job(
            request.user.default_tenant_id, request.user, request.data, request=request
        )
        return Response(_serialize_job(job, detail=True), status=201)


class AutomationJobDetailView(APIView):
    def get(self, request, job_id):
        _check(request, self, "automation.view")
        job = JobService.get_job(request.user.default_tenant_id, job_id)
        return Response(_serialize_job(job, detail=True))

    def patch(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.update_job(
            request.user.default_tenant_id, request.user, job_id, request.data, request=request
        )
        return Response(_serialize_job(job, detail=True))

    def delete(self, request, job_id):
        _check(request, self, "automation.manage")
        JobService.delete_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(status=204)


class AutomationDashboardView(APIView):
    def get(self, request):
        _check(request, self, "automation.view")
        tenant_id = request.user.default_tenant_id
        stats = DashboardService.stats_for_tenant(tenant_id)
        recent = [
            _serialize_job(job)
            for job in DashboardService.recent_jobs(tenant_id, limit=8)
        ]
        return Response({"stats": stats, "recent_jobs": recent})


class AutomationQueueView(APIView):
    def get(self, request):
        _check(request, self, "automation.view")
        stats = DashboardService.stats_for_tenant(request.user.default_tenant_id)
        jobs = JobService.list_jobs(
            request.user.default_tenant_id,
            status=JobStatus.QUEUED,
        )[:50]
        return Response(
            {
                "queue_size": stats["queue_size"],
                "jobs": [_serialize_job(j) for j in jobs],
            }
        )


class AutomationWorkersView(APIView):
    def get(self, request):
        _check(request, self, "automation.view")
        workers = WorkerService.list_workers()
        return Response(
            {
                "results": [
                    {
                        "id": str(w.id),
                        "worker_id": w.worker_id,
                        "hostname": w.hostname,
                        "status": w.status,
                        "current_job_id": str(w.current_job_id) if w.current_job_id else None,
                        "cpu_time_ms": w.cpu_time_ms,
                        "memory_mb": w.memory_mb,
                        "started_at": w.started_at.isoformat() if w.started_at else None,
                        "last_heartbeat": w.last_heartbeat.isoformat() if w.last_heartbeat else None,
                        "last_activity": w.last_activity.isoformat() if w.last_activity else None,
                    }
                    for w in workers
                ]
            }
        )


class JobTypeListView(APIView):
    def get(self, request):
        _check(request, self, "automation.view")
        return Response(
            {
                "results": [{"value": t.value, "label": t.label} for t in JobType],
                "priorities": [{"value": p.value, "label": p.label} for p in JobPriority],
                "statuses": [{"value": s.value, "label": s.label} for s in JobStatus],
            }
        )


class AutomationNotificationsView(APIView):
    def get(self, request):
        _check(request, self, "automation.view")
        unread = request.query_params.get("unread") == "1"
        notifications = NotificationService.list_for_user(
            request.user.default_tenant_id,
            request.user,
            unread_only=unread,
        )[:50]
        return Response(
            {
                "results": [
                    {
                        "id": str(n.id),
                        "title": n.title,
                        "body": n.body,
                        "notification_type": n.notification_type,
                        "channel": n.channel,
                        "job_id": str(n.job_id) if n.job_id else None,
                        "read_at": n.read_at.isoformat() if n.read_at else None,
                        "created_at": n.created_at.isoformat(),
                    }
                    for n in notifications
                ]
            }
        )


class AutomationJobLogsView(APIView):
    def get(self, request, job_id):
        _check(request, self, "automation.logs")
        job = JobService.get_job(request.user.default_tenant_id, job_id)
        logs = job.logs.order_by("-created_at")[:200]
        return Response(
            {
                "results": [
                    {
                        "id": str(log.id),
                        "level": log.level,
                        "message": log.message,
                        "metadata": log.metadata,
                        "created_at": log.created_at.isoformat(),
                    }
                    for log in logs
                ]
            }
        )


class AutomationJobProgressView(APIView):
    def get(self, request, job_id):
        _check(request, self, "automation.view")
        job = JobService.get_job(request.user.default_tenant_id, job_id)
        return Response(_serialize_job(job, detail=True))


class AutomationJobQueueView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.queue_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobPauseView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.pause_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobResumeView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.resume_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobRetryView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.retry_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobCancelView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.cancel")
        job = JobService.cancel_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobDuplicateView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.manage")
        job = JobService.duplicate_job(request.user.default_tenant_id, request.user, job_id, request=request)
        return Response(_serialize_job(job, detail=True))


class AutomationJobApproveView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.approve")
        job = JobService.approve_job(
            request.user.default_tenant_id, request.user, job_id, request=request
        )
        return Response(_serialize_job(job, detail=True))


class AutomationJobRejectView(APIView):
    def post(self, request, job_id):
        _check(request, self, "automation.approve")
        job = JobService.reject_job(
            request.user.default_tenant_id,
            request.user,
            job_id,
            reason=request.data.get("reason", ""),
            request=request,
        )
        return Response(_serialize_job(job, detail=True))
