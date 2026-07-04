from django.urls import path

from content.api.v1.views import (
    MediaListView,
    PageBlockDetailView,
    PageBlockListView,
    PageDetailView,
    PageDuplicateView,
    PageLinkDetailView,
    PageLinkListView,
    PageListView,
    PagePublishView,
    PageTermView,
    PageVersionDetailView,
    PageVersionListView,
    PublicPageResolveView,
    TaxonomyListView,
    TaxonomyTermListView,
    TemplateListView,
)

urlpatterns = [
    path("public/pages/resolve/", PublicPageResolveView.as_view(), name="content-public-page-resolve"),
    path("pages/", PageListView.as_view(), name="content-pages"),
    path("pages/<uuid:page_id>/", PageDetailView.as_view(), name="content-page-detail"),
    path("pages/<uuid:page_id>/duplicate/", PageDuplicateView.as_view(), name="content-page-duplicate"),
    path("pages/<uuid:page_id>/publish/", PagePublishView.as_view(), name="content-page-publish"),
    path("pages/<uuid:page_id>/versions/", PageVersionListView.as_view(), name="content-page-versions"),
    path(
        "pages/<uuid:page_id>/versions/<int:version_number>/",
        PageVersionDetailView.as_view(),
        name="content-page-version-detail",
    ),
    path("pages/<uuid:page_id>/blocks/", PageBlockListView.as_view(), name="content-page-blocks"),
    path(
        "pages/<uuid:page_id>/blocks/<uuid:block_id>/",
        PageBlockDetailView.as_view(),
        name="content-page-block-detail",
    ),
    path("pages/<uuid:page_id>/terms/", PageTermView.as_view(), name="content-page-terms"),
    path(
        "pages/<uuid:page_id>/terms/<uuid:term_id>/",
        PageTermView.as_view(),
        name="content-page-term-remove",
    ),
    path("pages/<uuid:page_id>/links/", PageLinkListView.as_view(), name="content-page-links"),
    path(
        "pages/<uuid:page_id>/links/<uuid:link_id>/",
        PageLinkDetailView.as_view(),
        name="content-page-link-detail",
    ),
    path("taxonomies/", TaxonomyListView.as_view(), name="content-taxonomies"),
    path(
        "taxonomies/<uuid:taxonomy_id>/terms/",
        TaxonomyTermListView.as_view(),
        name="content-taxonomy-terms",
    ),
    path("templates/", TemplateListView.as_view(), name="content-templates"),
    path("media/", MediaListView.as_view(), name="content-media"),
]
