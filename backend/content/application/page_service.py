from content.application.url_hierarchy_service import UrlHierarchyService
from content.domain.status import PageStatus
from content.infrastructure.models import ContentBlock, Page, PageTerm
from seo.application.slug_service import SlugService


class PageService:
    @staticmethod
    def list_pages(tenant_id, *, status=None, page_type=None, parent_id=None):
        qs = Page.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        if status:
            qs = qs.filter(status=status)
        if page_type:
            qs = qs.filter(page_type=page_type)
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        return qs.select_related("parent", "template", "author").order_by("sort_order", "title")

    @staticmethod
    def get_page(tenant_id, page_id) -> Page:
        return Page.objects.select_related("parent", "template", "author").get(
            id=page_id,
            tenant_id=tenant_id,
            deleted_at__isnull=True,
        )

    @classmethod
    def _resolve_path(cls, slug: str, parent: Page | None, page_type: str) -> str:
        return UrlHierarchyService.build_page_path(slug, parent, page_type=page_type)

    @classmethod
    def create_page(cls, tenant_id, user, data: dict) -> Page:
        parent = None
        page_type = data.get("page_type", "landing_page")
        locale = data.get("locale", "he")

        if parent_id := data.get("parent_id"):
            parent = Page.objects.get(id=parent_id, tenant_id=tenant_id, deleted_at__isnull=True)

        slug = data.get("slug") or SlugService.generate_unique_slug(tenant_id, data["title"], locale=locale)
        full_path = cls._resolve_path(slug, parent, page_type)

        if not UrlHierarchyService.is_path_available(tenant_id, full_path, locale):
            slug = SlugService.generate_unique_slug(tenant_id, data["title"], locale=locale)
            full_path = cls._resolve_path(slug, parent, page_type)

        author_id = data.get("author_id")
        page = Page.objects.create(
            tenant_id=tenant_id,
            parent=parent,
            template_id=data.get("template_id"),
            page_type=page_type,
            status=PageStatus.DRAFT,
            locale=locale,
            title=data["title"],
            slug=slug,
            full_path=full_path,
            meta_title=data.get("meta_title", ""),
            meta_description=data.get("meta_description", ""),
            author_id=author_id or (user.id if user else None),
            created_by=user,
            updated_by=user,
        )
        return page

    @classmethod
    def update_page(cls, tenant_id, page_id, user, data: dict) -> Page:
        page = cls.get_page(tenant_id, page_id)

        if "title" in data:
            page.title = data["title"]
        if "meta_title" in data:
            page.meta_title = data["meta_title"]
        if "meta_description" in data:
            page.meta_description = data["meta_description"]
        if "page_type" in data:
            page.page_type = data["page_type"]
        if "template_id" in data:
            page.template_id = data["template_id"]
        if "sort_order" in data:
            page.sort_order = data["sort_order"]
        if "scheduled_at" in data:
            page.scheduled_at = data["scheduled_at"]
        if "author_id" in data:
            page.author_id = data["author_id"]

        if "parent_id" in data:
            parent = None
            if data["parent_id"]:
                parent = Page.objects.get(id=data["parent_id"], tenant_id=tenant_id, deleted_at__isnull=True)
            page.parent = parent

        if "slug" in data:
            page.slug = data["slug"]

        page.full_path = cls._resolve_path(page.slug, page.parent, page.page_type)
        page.updated_by = user
        page.save()
        cls._rebuild_child_paths(page)
        return page

    @classmethod
    def _rebuild_child_paths(cls, page: Page) -> None:
        for child in Page.objects.filter(parent_id=page.id, deleted_at__isnull=True):
            child.full_path = cls._resolve_path(child.slug, page, child.page_type)
            child.save(update_fields=["full_path", "updated_at"])
            cls._rebuild_child_paths(child)

    @staticmethod
    def serialize_page(page: Page) -> dict:
        return {
            "id": str(page.id),
            "title": page.title,
            "slug": page.slug,
            "full_path": page.full_path,
            "locale": page.locale,
            "page_type": page.page_type,
            "status": page.status,
            "parent_id": str(page.parent_id) if page.parent_id else None,
            "template_id": str(page.template_id) if page.template_id else None,
            "author_id": str(page.author_id) if page.author_id else None,
            "meta_title": page.meta_title,
            "meta_description": page.meta_description,
            "published_version": page.published_version,
            "published_at": page.published_at.isoformat() if page.published_at else None,
            "scheduled_at": page.scheduled_at.isoformat() if page.scheduled_at else None,
            "sort_order": page.sort_order,
            "created_at": page.created_at.isoformat(),
            "updated_at": page.updated_at.isoformat(),
        }

    @staticmethod
    def serialize_page_detail(page: Page) -> dict:
        data = PageService.serialize_page(page)
        data["blocks"] = [
            {
                "id": str(b.id),
                "block_type": b.block_type,
                "sort_order": b.sort_order,
                "config": b.config,
                "is_visible": b.is_visible,
            }
            for b in page.blocks.filter(deleted_at__isnull=True).order_by("sort_order")
        ]
        data["terms"] = [
            {
                "id": str(pt.term_id),
                "name": pt.term.name,
                "slug": pt.term.slug,
                "taxonomy": pt.term.taxonomy.slug,
            }
            for pt in page.page_terms.select_related("term", "term__taxonomy").filter(deleted_at__isnull=True)
        ]
        return data

    @staticmethod
    def soft_delete(tenant_id, page_id) -> None:
        page = PageService.get_page(tenant_id, page_id)
        page.soft_delete()
