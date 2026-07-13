from django.urls import include, path

urlpatterns = [
    path("", include("whatsapp.api.v1.urls")),
]
