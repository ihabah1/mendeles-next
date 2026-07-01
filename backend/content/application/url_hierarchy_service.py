"""URL path conventions per page type — single source for public routes."""

from content.domain.status import PageType
from content.infrastructure.models import Page

# Root prefix when a page has no parent in the hierarchy.
PAGE_TYPE_ROOT_PREFIX: dict[str, str] = {
    PageType.LANDING_PAGE: "/pages",
    PageType.BLOG: "/blog",
    PageType.STATIC: "",
    PageType.RESOURCE: "/resources",
    PageType.INDUSTRY: "/industries",
    PageType.TEMPLATE_PREVIEW: "/templates",
}

# Marketing routes served by static Next.js (not DB pages) — documented for builders.
STATIC_MARKETING_PREFIXES = (
    "/",
    "/solutions",
    "/industries",
    "/company",
)


class UrlHierarchyService:
    """Build and validate hierarchical URL paths."""

    @staticmethod
    def segment(slug: str) -> str:
        return slug.strip("/")

    @classmethod
    def root_prefix(cls, page_type: str) -> str:
        return PAGE_TYPE_ROOT_PREFIX.get(page_type, "/pages")

    @classmethod
    def build_page_path(
        cls,
        slug: str,
        parent: Page | None = None,
        *,
        page_type: str | None = None,
    ) -> str:
        slug = cls.segment(slug)
        if parent and parent.full_path:
            base = parent.full_path.rstrip("/")
            return f"{base}/{slug}"

        prefix = cls.root_prefix(page_type or PageType.LANDING_PAGE)
        if not prefix:
            return f"/{slug}"
        return f"{prefix}/{slug}"

    @classmethod
    def build_term_path(cls, slug: str, parent=None) -> str:
        from content.infrastructure.models import TaxonomyTerm

        slug = cls.segment(slug)
        if parent and isinstance(parent, TaxonomyTerm) and parent.full_path:
            base = parent.full_path.rstrip("/")
            return f"{base}/{slug}"
        return slug

    @classmethod
    def is_path_available(cls, tenant_id, full_path: str, locale: str, *, exclude_page_id=None) -> bool:
        qs = Page.objects.filter(
            tenant_id=tenant_id,
            full_path=full_path,
            locale=locale,
            deleted_at__isnull=True,
        )
        if exclude_page_id:
            qs = qs.exclude(id=exclude_page_id)
        return not qs.exists()

    @classmethod
    def descendants_paths(cls, page: Page) -> list[str]:
        prefix = page.full_path.rstrip("/")
        return list(
            Page.objects.filter(
                tenant_id=page.tenant_id,
                full_path__startswith=f"{prefix}/",
                deleted_at__isnull=True,
            ).values_list("full_path", flat=True)
        )
