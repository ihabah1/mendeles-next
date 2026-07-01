from django.urls import path

from seo.api.v1.views import (
    SEOMetadataView,
    SEOPublicView,
    SEORedirectListView,
    SEORobotsView,
    SEOSettingsView,
    SEOSitemapView,
    SEOSlugGenerateView,
    SEOStatusView,
    SEOValidateView,
)

urlpatterns = [
    path("settings/", SEOSettingsView.as_view(), name="seo-settings"),
    path("status/", SEOStatusView.as_view(), name="seo-status"),
    path("validate/", SEOValidateView.as_view(), name="seo-validate"),
    path("metadata/", SEOMetadataView.as_view(), name="seo-metadata"),
    path("sitemap/", SEOSitemapView.as_view(), name="seo-sitemap"),
    path("robots/", SEORobotsView.as_view(), name="seo-robots"),
    path("public/", SEOPublicView.as_view(), name="seo-public"),
    path("redirects/", SEORedirectListView.as_view(), name="seo-redirects"),
    path("slugs/generate/", SEOSlugGenerateView.as_view(), name="seo-slug-generate"),
]
