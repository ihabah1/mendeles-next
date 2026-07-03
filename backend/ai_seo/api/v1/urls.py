from django.urls import path

from ai_seo.api.v1.views import (
    AiSeoContentStudioView,
    AiSeoDashboardView,
    AiSeoKeywordsStudioView,
    AiSeoRefreshView,
    AiSeoReviewStudioView,
    AiSeoWorkspaceCancelJobView,
    AiSeoWorkspaceDeleteJobView,
    AiSeoWorkspaceGenerateView,
    AiSeoWorkspacePublishView,
    AiSeoWorkspaceRegenerateView,
    AiSeoWorkspaceRetryStepView,
    AiSeoWorkspaceRunJobView,
    AiSeoWorkspaceRunNextView,
    AiSeoWorkspaceView,
)

urlpatterns = [
    path("dashboard/", AiSeoDashboardView.as_view(), name="ai-seo-dashboard"),
    path("studio/keywords/", AiSeoKeywordsStudioView.as_view(), name="ai-seo-studio-keywords"),
    path("studio/content/", AiSeoContentStudioView.as_view(), name="ai-seo-studio-content"),
    path("studio/review/", AiSeoReviewStudioView.as_view(), name="ai-seo-studio-review"),
    path("refresh/", AiSeoRefreshView.as_view(), name="ai-seo-refresh"),
    path("workspace/", AiSeoWorkspaceView.as_view(), name="ai-seo-workspace"),
    path("workspace/generate/", AiSeoWorkspaceGenerateView.as_view(), name="ai-seo-workspace-generate"),
    path("workspace/regenerate/", AiSeoWorkspaceRegenerateView.as_view(), name="ai-seo-workspace-regenerate"),
    path("workspace/publish/", AiSeoWorkspacePublishView.as_view(), name="ai-seo-workspace-publish"),
    path("workspace/queue/run-next/", AiSeoWorkspaceRunNextView.as_view(), name="ai-seo-workspace-run-next"),
    path("workspace/jobs/<uuid:job_id>/run/", AiSeoWorkspaceRunJobView.as_view(), name="ai-seo-workspace-run-job"),
    path("workspace/jobs/<uuid:job_id>/steps/<uuid:step_id>/retry/", AiSeoWorkspaceRetryStepView.as_view(), name="ai-seo-workspace-retry-step"),
    path("workspace/jobs/<uuid:job_id>/cancel/", AiSeoWorkspaceCancelJobView.as_view(), name="ai-seo-workspace-cancel-job"),
    path("workspace/jobs/<uuid:job_id>/delete/", AiSeoWorkspaceDeleteJobView.as_view(), name="ai-seo-workspace-delete-job"),
]
