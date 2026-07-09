from django.urls import path

from client_portal.api.v1.views import ClientDashboardView, ClientRequestsView

urlpatterns = [
    path("dashboard/", ClientDashboardView.as_view(), name="client-dashboard"),
    path("requests/", ClientRequestsView.as_view(), name="client-requests"),
]
