from content.infrastructure.models import Page, TaxonomyTerm


class UrlHierarchyService:
    """Build and validate hierarchical URL paths."""

    @staticmethod
    def segment(slug: str) -> str:
        return slug.strip("/")

    @classmethod
    def build_page_path(cls, slug: str, parent: Page | None = None) -> str:
        slug = cls.segment(slug)
        if parent and parent.full_path:
            base = parent.full_path.rstrip("/")
            return f"{base}/{slug}"
        return f"/{slug}"

    @classmethod
    def build_term_path(cls, slug: str, parent: TaxonomyTerm | None = None) -> str:
        slug = cls.segment(slug)
        if parent and parent.full_path:
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
