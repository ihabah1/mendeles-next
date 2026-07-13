from django.urls import path

from whatsapp.api.v1.views import (
    WhatsAppConnectView,
    WhatsAppDisconnectView,
    WhatsAppHealthView,
    WhatsAppQrView,
    WhatsAppRefreshView,
    WhatsAppSimulateView,
    WhatsAppStatusView,
    WhatsAppWebhookView,
)

urlpatterns = [
    path("status/", WhatsAppStatusView.as_view(), name="whatsapp-status"),
    path("health/", WhatsAppHealthView.as_view(), name="whatsapp-health"),
    path("connect/", WhatsAppConnectView.as_view(), name="whatsapp-connect"),
    path("disconnect/", WhatsAppDisconnectView.as_view(), name="whatsapp-disconnect"),
    path("qr/", WhatsAppQrView.as_view(), name="whatsapp-qr"),
    path("refresh/", WhatsAppRefreshView.as_view(), name="whatsapp-refresh"),
    path("webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path("simulate/", WhatsAppSimulateView.as_view(), name="whatsapp-simulate"),
]
