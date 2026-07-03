from django.urls import path

from ai_seo.api.v1.views import (
    AiSeoContentStudioView,
    AiSeoDashboardView,
    AiSeoKeywordsStudioView,
    AiSeoRefreshView,
    AiSeoReviewStudioView,
)

urlpatterns = [
    path("dashboard/", AiSeoDashboardView.as_view(), name="ai-seo-dashboard"),
    path("studio/keywords/", AiSeoKeywordsStudioView.as_view(), name="ai-seo-studio-keywords"),
    path("studio/content/", AiSeoContentStudioView.as_view(), name="ai-seo-studio-content"),
    path("studio/review/", AiSeoReviewStudioView.as_view(), name="ai-seo-studio-review"),
    path("refresh/", AiSeoRefreshView.as_view(), name="ai-seo-refresh"),
]
