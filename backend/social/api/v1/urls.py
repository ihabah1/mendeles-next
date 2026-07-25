from django.urls import path

from social.api.v1.views import (
    CampaignBatchRepublishView,
    CampaignDetailView,
    CampaignInstagramImageView,
    CampaignListCreateView,
    CampaignPlatformMediaView,
    CampaignReportExportView,
    CampaignReportView,
    CampaignRepublishView,
    CampaignSimulateView,
    CampaignTikTokVideoView,
    RandomRepublishCronView,
    SocialPublishView,
    SocialStatusView,
    VideoProvidersStatusView,
)

urlpatterns = [
    path("status/", SocialStatusView.as_view(), name="social-status"),
    path("video-providers/", VideoProvidersStatusView.as_view(), name="social-video-providers"),
    path("campaigns/", CampaignListCreateView.as_view(), name="social-campaigns"),
    path("campaigns/<uuid:campaign_id>/", CampaignDetailView.as_view(), name="social-campaign-detail"),
    path(
        "campaigns/<uuid:campaign_id>/simulate/",
        CampaignSimulateView.as_view(),
        name="social-campaign-simulate",
    ),
    path(
        "campaigns/<uuid:campaign_id>/instagram-image/",
        CampaignInstagramImageView.as_view(),
        name="social-campaign-instagram-image",
    ),
    path(
        "campaigns/<uuid:campaign_id>/platform-media/",
        CampaignPlatformMediaView.as_view(),
        name="social-campaign-platform-media",
    ),
    path(
        "campaigns/<uuid:campaign_id>/tiktok-video/",
        CampaignTikTokVideoView.as_view(),
        name="social-campaign-tiktok-video",
    ),
    path(
        "campaigns/<uuid:campaign_id>/campaign-video/",
        CampaignTikTokVideoView.as_view(),
        name="social-campaign-video",
    ),
    path(
        "campaigns/<uuid:campaign_id>/republish/",
        CampaignRepublishView.as_view(),
        name="social-campaign-republish",
    ),
    path("republish-batch/", CampaignBatchRepublishView.as_view(), name="social-republish-batch"),
    path("republish-cron/", RandomRepublishCronView.as_view(), name="social-republish-cron"),
    path("campaign-report/", CampaignReportView.as_view(), name="social-campaign-report"),
    path(
        "campaign-report/export.csv",
        CampaignReportExportView.as_view(),
        name="social-campaign-report-export",
    ),
    path("publish/", SocialPublishView.as_view(), name="social-publish"),
]
