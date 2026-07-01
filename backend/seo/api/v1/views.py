import os

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions.base import HasPermission
from seo.application.metadata_service import MetadataService
from seo.application.redirect_service import RedirectService
from seo.application.robots_service import RobotsService
from seo.application.schema_service import SchemaService
from seo.application.settings_service import SEOSettingsService
from seo.application.sitemap_service import SitemapService
from seo.application.slug_service import SlugService
from seo.application.validation_service import SEOValidationService
from tenancy.infrastructure.models import Tenant


def _resolve_public_tenant_id() -> str | None:
    slug = os.environ.get("SEO_PUBLIC_TENANT_SLUG", "")
    if slug:
        tenant = Tenant.objects.filter(slug=slug, deleted_at__isnull=True).first()
        return str(tenant.id) if tenant else None
    tenant = Tenant.objects.filter(deleted_at__isnull=True, status="active").order_by("created_at").first()
    return str(tenant.id) if tenant else None


def _check_permission(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        from core.exceptions.base import ForbiddenError

        raise ForbiddenError()


class SEOSettingsView(APIView):
    def get(self, request):
        _check_permission(request, self, "seo.view")
        tenant_id = request.user.default_tenant_id
        return Response(SEOSettingsService.get_settings(tenant_id))

    def patch(self, request):
        _check_permission(request, self, "seo.manage")
        tenant_id = request.user.default_tenant_id
        data = SEOSettingsService.update_settings(tenant_id, request.data)
        return Response(data)


class SEOStatusView(APIView):
    permission_classes = [HasPermission]
    required_permission = "seo.view"

    def get(self, request):
        return Response(SEOValidationService.status(request.user.default_tenant_id))


class SEOValidateView(APIView):
    permission_classes = [HasPermission]
    required_permission = "seo.view"

    def post(self, request):
        tenant_id = request.user.default_tenant_id
        page = request.data.get("page")
        if page:
            return Response(SEOValidationService.validate_page(tenant_id, page))
        return Response(SEOValidationService.validate_global(tenant_id))


class SEOMetadataView(APIView):
    permission_classes = [HasPermission]
    required_permission = "seo.view"

    def post(self, request):
        tenant_id = request.user.default_tenant_id
        page = request.data.get("page", {})
        metadata = MetadataService.build(tenant_id, page=page)
        breadcrumbs = page.get("breadcrumbs")
        schemas = SchemaService.for_page(tenant_id, breadcrumbs=breadcrumbs)
        return Response({"metadata": metadata, "schemas": schemas})


class SEOSitemapView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user and request.user.is_authenticated:
            _check_permission(request, self, "seo.view")
            tenant_id = request.user.default_tenant_id
        else:
            tenant_id = _resolve_public_tenant_id()
            if not tenant_id:
                return Response({"entries": []})
        return Response({"entries": SitemapService.collect_all(tenant_id)})


class SEORobotsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant_id = _resolve_public_tenant_id()
        if not tenant_id:
            return Response({"content": "User-agent: *\nDisallow: /\n"}, content_type="text/plain")
        content = RobotsService.generate(tenant_id)
        return Response({"content": content})


class SEOPublicView(APIView):
    """Public SEO bundle for SSR metadata generation (no auth)."""

    permission_classes = [AllowAny]

    def get(self, request):
        tenant_id = _resolve_public_tenant_id()
        if not tenant_id:
            return Response({})
        settings = SEOSettingsService.get_settings(tenant_id)
        return Response(
            {
                "settings": settings,
                "schemas": SchemaService.for_page(tenant_id),
            }
        )


class SEORedirectListView(APIView):
    def get(self, request):
        _check_permission(request, self, "seo.view")
        return Response({"results": RedirectService.list_redirects(request.user.default_tenant_id)})

    def post(self, request):
        _check_permission(request, self, "seo.manage")
        data = RedirectService.create_redirect(
            request.user.default_tenant_id,
            from_path=request.data.get("from_path", ""),
            to_path=request.data.get("to_path", ""),
            status_code=int(request.data.get("status_code", 301)),
        )
        return Response(data, status=201)


class SEOSlugGenerateView(APIView):
    permission_classes = [HasPermission]
    required_permission = "seo.manage"

    def post(self, request):
        tenant_id = request.user.default_tenant_id
        text = request.data.get("text", "")
        locale = request.data.get("locale", "he")
        slug = SlugService.generate_unique_slug(tenant_id, text, locale=locale)
        return Response({"slug": slug})
