import os

from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from content.application.block_service import BlockService
from content.application.duplicate_service import DuplicateService
from content.application.internal_link_service import InternalLinkService
from content.application.media_service import MediaService
from content.application.page_service import PageService
from content.application.publish_service import PublishService
from content.application.taxonomy_service import TaxonomyService
from content.application.template_service import TemplateService
from content.application.version_service import VersionService
from content.domain.status import PageStatus
from content.infrastructure.models import ContentBlock, InternalLink, Page
from tenancy.infrastructure.models import Tenant


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        from core.exceptions.base import ForbiddenError

        raise ForbiddenError()


def _resolve_public_tenant_id() -> str | None:
    slug = os.environ.get("SEO_PUBLIC_TENANT_SLUG", "")
    if slug:
        tenant = Tenant.objects.filter(slug=slug, deleted_at__isnull=True).first()
        return str(tenant.id) if tenant else None
    tenant = Tenant.objects.filter(deleted_at__isnull=True, status="active").order_by("created_at").first()
    return str(tenant.id) if tenant else None


class PublicPageResolveView(APIView):
    """Resolve a published content page by public path without requiring admin auth."""

    permission_classes = [AllowAny]

    def get(self, request):
        tenant_id = _resolve_public_tenant_id()
        if not tenant_id:
            return Response({"error": {"code": "not_found", "message": "Page not found"}}, status=404)

        raw_path = request.query_params.get("path", "")
        path = "/" + raw_path.strip().strip("/")
        locale = request.query_params.get("locale") or "he"
        page = (
            Page.objects.select_related("parent", "template", "author")
            .filter(
                tenant_id=tenant_id,
                full_path=path,
                locale=locale,
                status=PageStatus.PUBLISHED,
                deleted_at__isnull=True,
            )
            .first()
        )
        if not page:
            return Response({"error": {"code": "not_found", "message": "Page not found"}}, status=404)
        return Response(PageService.serialize_page_detail(page))


class PublicPageListView(APIView):
    """Public list of published pages for blog/feed views."""

    permission_classes = [AllowAny]

    def get(self, request):
        tenant_id = _resolve_public_tenant_id()
        if not tenant_id:
            return Response({"results": [], "categories": []})

        locale = request.query_params.get("locale") or "he"
        page_type = request.query_params.get("page_type") or "blog"
        query = (request.query_params.get("q") or "").strip()
        category = (request.query_params.get("category") or "").strip()
        qs = (
            Page.objects.filter(
                tenant_id=tenant_id,
                locale=locale,
                page_type=page_type,
                status=PageStatus.PUBLISHED,
                deleted_at__isnull=True,
            )
            .prefetch_related("page_terms__term", "blocks")
            .order_by("-published_at", "-created_at")
        )
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(meta_description__icontains=query))
        if category:
            qs = qs.filter(page_terms__term__slug=category, page_terms__deleted_at__isnull=True)

        pages = list(qs.distinct()[:50])
        categories = {}
        for page in pages:
            for page_term in page.page_terms.filter(deleted_at__isnull=True):
                categories[page_term.term.slug] = {
                    "slug": page_term.term.slug,
                    "name": page_term.term.name,
                }

        return Response(
            {
                "results": [PageService.serialize_page_detail(page) for page in pages],
                "categories": sorted(categories.values(), key=lambda item: item["name"]),
            }
        )


class PageListView(APIView):
    def get(self, request):
        _check(request, self, "content.view")
        tenant_id = request.user.default_tenant_id
        pages = PageService.list_pages(
            tenant_id,
            status=request.query_params.get("status"),
            page_type=request.query_params.get("page_type"),
            parent_id=request.query_params.get("parent_id"),
        )
        return Response({"results": [PageService.serialize_page(p) for p in pages]})

    def post(self, request):
        _check(request, self, "content.create")
        page = PageService.create_page(request.user.default_tenant_id, request.user, request.data)
        return Response(PageService.serialize_page(page), status=201)


class PageDetailView(APIView):
    def get(self, request, page_id):
        _check(request, self, "content.view")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        return Response(PageService.serialize_page_detail(page))

    def patch(self, request, page_id):
        _check(request, self, "content.edit")
        page = PageService.update_page(
            request.user.default_tenant_id, page_id, request.user, request.data
        )
        return Response(PageService.serialize_page(page))

    def delete(self, request, page_id):
        _check(request, self, "content.delete")
        PageService.soft_delete(request.user.default_tenant_id, page_id)
        return Response(status=204)


class PageDuplicateView(APIView):
    def post(self, request, page_id):
        _check(request, self, "content.create")
        page = DuplicateService.duplicate_page(
            request.user.default_tenant_id,
            page_id,
            request.user,
            title_suffix=request.data.get("title_suffix", " (copy)"),
        )
        return Response(PageService.serialize_page(page), status=201)


class PagePublishView(APIView):
    def post(self, request, page_id):
        _check(request, self, "content.publish")
        target = request.data.get("status", PageStatus.PUBLISHED)
        if target == PageStatus.UNPUBLISHED:
            page = PublishService.unpublish(request.user.default_tenant_id, page_id, request.user)
        else:
            page = PublishService.transition(
                request.user.default_tenant_id,
                page_id,
                request.user,
                target,
                change_summary=request.data.get("change_summary", ""),
            )
        return Response(PageService.serialize_page(page))


class PageVersionListView(APIView):
    permission_classes = [HasPermission]
    required_permission = "content.view"

    def get(self, request, page_id):
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        versions = VersionService.list_versions(page)
        return Response({"results": [VersionService.serialize_version(v) for v in versions]})


class PageVersionDetailView(APIView):
    permission_classes = [HasPermission]
    required_permission = "content.view"

    def get(self, request, page_id, version_number):
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        version = VersionService.get_version(page, int(version_number))
        return Response(VersionService.serialize_version(version))


class PageBlockListView(APIView):
    def get(self, request, page_id):
        _check(request, self, "content.view")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        blocks = BlockService.list_blocks(page)
        return Response({"results": [BlockService.serialize_block(b) for b in blocks]})

    def post(self, request, page_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        block = BlockService.create_block(page, request.data)
        return Response(BlockService.serialize_block(block), status=201)


class PageBlockDetailView(APIView):
    def patch(self, request, page_id, block_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        block = ContentBlock.objects.get(id=block_id, page=page, deleted_at__isnull=True)
        block = BlockService.update_block(block, request.data)
        return Response(BlockService.serialize_block(block))

    def delete(self, request, page_id, block_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        block = ContentBlock.objects.get(id=block_id, page=page, deleted_at__isnull=True)
        BlockService.delete_block(block)
        return Response(status=204)


class PageTermView(APIView):
    def post(self, request, page_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        TaxonomyService.assign_term(page, request.data["term_id"])
        return Response({"message": "assigned"}, status=201)

    def delete(self, request, page_id, term_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        TaxonomyService.remove_term(page, term_id)
        return Response(status=204)


class PageLinkListView(APIView):
    def get(self, request, page_id):
        _check(request, self, "content.view")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        links = InternalLinkService.list_outbound(page)
        return Response({"results": [InternalLinkService.serialize_link(link) for link in links]})

    def post(self, request, page_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        link = InternalLinkService.create_link(request.user.default_tenant_id, page, request.data)
        return Response(InternalLinkService.serialize_link(link), status=201)


class PageLinkDetailView(APIView):
    def delete(self, request, page_id, link_id):
        _check(request, self, "content.edit")
        page = PageService.get_page(request.user.default_tenant_id, page_id)
        link = InternalLink.objects.get(id=link_id, source_page=page, deleted_at__isnull=True)
        InternalLinkService.delete_link(link)
        return Response(status=204)


class TaxonomyListView(APIView):
    def get(self, request):
        _check(request, self, "content.view")
        taxonomies = TaxonomyService.list_taxonomies(request.user.default_tenant_id)
        return Response({"results": [TaxonomyService.serialize_taxonomy(t) for t in taxonomies]})

    def post(self, request):
        _check(request, self, "content.create")
        taxonomy = TaxonomyService.create_taxonomy(request.user.default_tenant_id, request.data)
        return Response(TaxonomyService.serialize_taxonomy(taxonomy), status=201)


class TaxonomyTermListView(APIView):
    def get(self, request, taxonomy_id):
        _check(request, self, "content.view")
        terms = TaxonomyService.list_terms(request.user.default_tenant_id, taxonomy_id)
        return Response({"results": [TaxonomyService.serialize_term(t) for t in terms]})

    def post(self, request, taxonomy_id):
        _check(request, self, "content.create")
        term = TaxonomyService.create_term(
            request.user.default_tenant_id, taxonomy_id, request.data
        )
        return Response(TaxonomyService.serialize_term(term), status=201)


class TemplateListView(APIView):
    def get(self, request):
        _check(request, self, "content.view")
        templates = TemplateService.list_templates(
            request.user.default_tenant_id,
            page_type=request.query_params.get("page_type"),
        )
        return Response({"results": [TemplateService.serialize_template(t) for t in templates]})

    def post(self, request):
        _check(request, self, "content.create")
        template = TemplateService.create_template(request.user.default_tenant_id, request.data)
        return Response(TemplateService.serialize_template(template), status=201)


class MediaListView(APIView):
    def get(self, request):
        _check(request, self, "content.view")
        assets = MediaService.list_media(
            request.user.default_tenant_id,
            media_type=request.query_params.get("media_type"),
        )
        return Response({"results": [MediaService.serialize_media(a) for a in assets]})

    def post(self, request):
        _check(request, self, "content.create")
        asset = MediaService.create_media(
            request.user.default_tenant_id, request.user, request.data
        )
        return Response(MediaService.serialize_media(asset), status=201)
