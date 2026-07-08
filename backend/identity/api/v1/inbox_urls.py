from django.urls import path

from identity.api.v1.inbox_views import InboxListView, InboxMarkReadView, InboxSendView

urlpatterns = [
    path("", InboxListView.as_view(), name="inbox-list"),
    path("send/", InboxSendView.as_view(), name="inbox-send"),
    path("<uuid:message_id>/read/", InboxMarkReadView.as_view(), name="inbox-mark-read"),
]
