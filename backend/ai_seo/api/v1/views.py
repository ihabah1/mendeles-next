from rest_framework.response import Response
from rest_framework.views import APIView

from ai_seo.application.dashboard_service import AiSeoDashboardService
from ai_seo.application.generation_service import AiSeoGenerationService
from automation.application.executor import JobExecutor
from automation.application.job_service import JobService
from automation.domain.enums import JobStatus, JobType
from automation.infrastructure.models import AutomationJob
from audit.application.audit_service import AuditService
from core.exceptions.base import ForbiddenError
from core.permissions.base import HasPermission
from integrations.application.google_oauth_service import GoogleOAuthError
from integrations.application.sync_service import IntegrationSyncService
from integrations.domain.enums import GoogleServiceType


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


class AiSeoDashboardView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.build(tenant_id))


class AiSeoKeywordsStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.keywords_studio(tenant_id))


class AiSeoContentStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        services = AiSeoDashboardService.service_flags(tenant_id)
        ai = next((s for s in services if s["id"] == "ai_provider"), None)
        return Response(
            {
                "available": bool(ai and ai["connected"]),
                "services": services,
                "implemented_job_types": [],
                "message": (
                    "Content generation is not configured. Set GEMINI_API_KEY and connect integrations."
                    if not (ai and ai["connected"])
                    else "Content generation is available in the AI SEO Workspace."
                ),
            }
        )


class AiSeoReviewStudioView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(AiSeoDashboardService.content_review(tenant_id))


class AiSeoRefreshView(APIView):
    def post(self, request):
        _check(request, self, "ai_seo.manage")
        tenant_id = request.user.default_tenant_id
        section = request.data.get("section", "all")
        queued = []

        mapping = {
            "search_console": GoogleServiceType.SEARCH_CONSOLE,
            "analytics": GoogleServiceType.ANALYTICS,
            "trends": GoogleServiceType.TRENDS,
        }
        targets = list(mapping.keys()) if section == "all" else [section]

        for key in targets:
            service_type = mapping.get(key)
            if not service_type:
                continue
            try:
                job = IntegrationSyncService.enqueue_sync(
                    tenant_id,
                    request.user,
                    service_type,
                    config=request.data.get("config") or {},
                    request=request,
                )
                queued.append({"section": key, "job_id": str(job.id), "status": job.status})
            except (GoogleOAuthError, ValueError, Exception) as exc:
                queued.append({"section": key, "error": str(exc)})

        AuditService.log(
            tenant_id=tenant_id,
            user=request.user,
            action="ai_seo.refresh_requested",
            resource_type="ai_seo",
            metadata={"section": section, "queued": queued},
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        return Response({"queued": queued, "dashboard": AiSeoDashboardService.build(tenant_id)})


class AiSeoWorkspaceView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        return Response(AiSeoGenerationService.workspace_state(request.user.default_tenant_id))


class AiSeoWorkspaceResearchView(APIView):
    def get(self, request):
        _check(request, self, "ai_seo.view")
        return Response(AiSeoGenerationService.seo_research(request.user.default_tenant_id))

    def post(self, request):
        _check(request, self, "ai_seo.manage")
        return Response(
            AiSeoGenerationService.seo_research(
                request.user.default_tenant_id,
                refresh=bool(request.data.get("refresh", True)),
                domains=request.data.get("domains") or [],
                keywords=request.data.get("keywords") or [],
            )
        )


class AiSeoWorkspaceGenerateView(APIView):
    def post(self, request):
        _check(request, self, "ai_seo.manage")
        try:
            jobs = AiSeoGenerationService.create_batch(
                request.user.default_tenant_id,
                request.user,
                request.data,
                request=request,
            )
        except RuntimeError as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(
            {
                "jobs": [AiSeoGenerationService.serialize_job(job) for job in jobs],
                "workspace": AiSeoGenerationService.workspace_state(request.user.default_tenant_id),
            },
            status=201,
        )


class AiSeoWorkspaceRegenerateView(APIView):
    def post(self, request):
        _check(request, self, "ai_seo.manage")
        try:
            job = AiSeoGenerationService.regenerate(
                request.user.default_tenant_id,
                request.user,
                request.data,
                request=request,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_job(job), status=201)


class AiSeoWorkspacePublishView(APIView):
    def post(self, request):
        _check(request, self, "content.publish")
        try:
            page = AiSeoGenerationService.publish_page(
                request.user.default_tenant_id,
                request.user,
                request.data["page_id"],
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_page(page))


class AiSeoWorkspacePublishJobView(APIView):
    def post(self, request, job_id):
        _check(request, self, "content.publish")
        try:
            job = AiSeoGenerationService.publish_job(
                request.user.default_tenant_id,
                request.user,
                job_id,
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_job(job))


class AiSeoWorkspaceDeletePageView(APIView):
    def delete(self, request, page_id):
        _check(request, self, "ai_seo.manage")
        try:
            AiSeoGenerationService.delete_page(request.user.default_tenant_id, page_id)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(status=204)


class AiSeoWorkspaceRunJobView(APIView):
    def post(self, request, job_id):
        _check(request, self, "ai_seo.manage")
        try:
            job = JobService.get_job(request.user.default_tenant_id, job_id)
            if job.status not in {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.SCHEDULED, JobStatus.FAILED}:
                return Response({"error": f"Job cannot run while status is {job.status}."}, status=400)
            if job.status in {JobStatus.SCHEDULED, JobStatus.FAILED}:
                job = JobService.queue_job(request.user.default_tenant_id, request.user, job.id, request=request)
            JobExecutor.run_next_step(job)
            job.refresh_from_db()
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_job(job))


class AiSeoWorkspaceRunNextView(APIView):
    def post(self, request):
        _check(request, self, "ai_seo.manage")
        tenant_id = request.user.default_tenant_id
        try:
            job = (
                AutomationJob.objects.filter(
                    tenant_id=tenant_id,
                    job_type__in=[JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE],
                    status=JobStatus.RUNNING,
                    deleted_at__isnull=True,
                ).order_by("created_at").first()
                or AutomationJob.objects.filter(
                    tenant_id=tenant_id,
                    job_type__in=[JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE],
                    status=JobStatus.QUEUED,
                    deleted_at__isnull=True,
                ).order_by("created_at").first()
            )
            if not job:
                return Response({"job": None, "workspace": AiSeoGenerationService.workspace_state(tenant_id)})
            JobExecutor.run_next_step(job)
            job.refresh_from_db()
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(
            {
                "job": AiSeoGenerationService.serialize_job(job),
                "workspace": AiSeoGenerationService.workspace_state(tenant_id),
            }
        )


class AiSeoWorkspaceRetryStepView(APIView):
    def post(self, request, job_id, step_id):
        _check(request, self, "ai_seo.manage")
        try:
            job = JobService.get_job(request.user.default_tenant_id, job_id)
            job = AiSeoGenerationService.reset_step_for_retry(job, step_id)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_job(job))


class AiSeoWorkspaceCancelJobView(APIView):
    def post(self, request, job_id):
        _check(request, self, "ai_seo.manage")
        try:
            job = JobService.cancel_job(request.user.default_tenant_id, request.user, job_id, request=request)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(AiSeoGenerationService.serialize_job(job))


class AiSeoWorkspaceDeleteJobView(APIView):
    def delete(self, request, job_id):
        _check(request, self, "ai_seo.manage")
        try:
            job = JobService.get_job(request.user.default_tenant_id, job_id)
            if job.status not in {JobStatus.COMPLETED, JobStatus.CANCELLED}:
                JobService.cancel_job(request.user.default_tenant_id, request.user, job.id, request=request)
            JobService.delete_job(request.user.default_tenant_id, request.user, job.id, request=request)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
        return Response(status=204)
