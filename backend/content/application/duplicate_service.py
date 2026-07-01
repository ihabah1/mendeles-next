from content.application.page_service import PageService
from content.application.url_hierarchy_service import UrlHierarchyService
from content.domain.status import PageStatus
from content.infrastructure.models import ContentBlock, Page, PageTerm
from seo.application.slug_service import SlugService


class DuplicateService:
    @classmethod
    def duplicate_page(cls, tenant_id, page_id, user, *, title_suffix: str = " (copy)") -> Page:
        source = PageService.get_page(tenant_id, page_id)
        new_title = f"{source.title}{title_suffix}"
        new_slug = SlugService.generate_unique_slug(tenant_id, new_title, locale=source.locale)

        duplicate = Page.objects.create(
            tenant_id=tenant_id,
            parent=source.parent,
            template=source.template,
            page_type=source.page_type,
            status=PageStatus.DRAFT,
            locale=source.locale,
            title=new_title,
            slug=new_slug,
            full_path=UrlHierarchyService.build_page_path(
                new_slug, source.parent, page_type=source.page_type
            ),
            meta_title=source.meta_title,
            meta_description=source.meta_description,
            author=source.author or user,
            created_by=user,
            updated_by=user,
        )

        for block in ContentBlock.objects.filter(page=source, deleted_at__isnull=True).order_by("sort_order"):
            ContentBlock.objects.create(
                page=duplicate,
                block_type=block.block_type,
                sort_order=block.sort_order,
                config=block.config,
                is_visible=block.is_visible,
            )

        for pt in PageTerm.objects.filter(page=source, deleted_at__isnull=True):
            PageTerm.objects.create(page=duplicate, term=pt.term)

        return duplicate
