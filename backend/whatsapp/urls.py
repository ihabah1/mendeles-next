from django.urls import path

from whatsapp.views import WhatsAppSimulateView, WhatsAppStatusView, WhatsAppWebhookView

urlpatterns = [
    path("webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path("status/", WhatsAppStatusView.as_view(), name="whatsapp-status"),
    path("simulate/", WhatsAppSimulateView.as_view(), name="whatsapp-simulate"),
]
