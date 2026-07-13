from django.urls import path

from social.api.v1.views import (
    CampaignDetailView,
    CampaignInstagramImageView,
    CampaignListCreateView,
    CampaignRepublishView,
    CampaignSimulateView,
    CampaignTikTokVideoView,
    SocialPublishView,
    SocialStatusView,
)

urlpatterns = [
    path("status/", SocialStatusView.as_view(), name="social-status"),
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
        "campaigns/<uuid:campaign_id>/tiktok-video/",
        CampaignTikTokVideoView.as_view(),
        name="social-campaign-tiktok-video",
    ),
    path(
        "campaigns/<uuid:campaign_id>/republish/",
        CampaignRepublishView.as_view(),
        name="social-campaign-republish",
    ),
    path("publish/", SocialPublishView.as_view(), name="social-publish"),
]
