from django.urls import path

from social.api.v1.views import (
    CampaignDetailView,
    CampaignListCreateView,
    CampaignRepublishView,
    SocialPublishView,
    SocialStatusView,
)

urlpatterns = [
    path("status/", SocialStatusView.as_view(), name="social-status"),
    path("campaigns/", CampaignListCreateView.as_view(), name="social-campaigns"),
    path("campaigns/<uuid:campaign_id>/", CampaignDetailView.as_view(), name="social-campaign-detail"),
    path(
        "campaigns/<uuid:campaign_id>/republish/",
        CampaignRepublishView.as_view(),
        name="social-campaign-republish",
    ),
    path("publish/", SocialPublishView.as_view(), name="social-publish"),
]
