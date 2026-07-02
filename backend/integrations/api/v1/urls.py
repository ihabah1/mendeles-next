from django.urls import path

from integrations.api.v1.views import (
    GoogleConnectView,
    GoogleDashboardView,
    GoogleDisconnectView,
    GoogleOAuthCallbackView,
    GooglePropertiesView,
    GooglePropertySelectView,
    GoogleSyncHistoryView,
    GoogleSyncView,
)

urlpatterns = [
    path("google/", GoogleDashboardView.as_view(), name="integrations-google"),
    path("google/connect/", GoogleConnectView.as_view(), name="integrations-google-connect"),
    path("google/disconnect/", GoogleDisconnectView.as_view(), name="integrations-google-disconnect"),
    path("google/oauth/callback/", GoogleOAuthCallbackView.as_view(), name="integrations-google-oauth-callback"),
    path("google/properties/", GooglePropertiesView.as_view(), name="integrations-google-properties"),
    path("google/properties/select/", GooglePropertySelectView.as_view(), name="integrations-google-property-select"),
    path("google/sync/", GoogleSyncView.as_view(), name="integrations-google-sync"),
    path("google/sync/history/", GoogleSyncHistoryView.as_view(), name="integrations-google-sync-history"),
]
