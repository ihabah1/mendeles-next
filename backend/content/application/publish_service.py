from django.utils import timezone

from content.application.page_service import PageService
from content.domain.status import PageStatus, can_transition
from content.infrastructure.models import Page
from seo.application.slug_service import SlugService
from seo.infrastructure.models import SEOSlug


CONTENT_TYPE_MAP = {
    "landing_page": SEOSlug.ContentType.LANDING_PAGE,
    "blog": SEOSlug.ContentType.BLOG,
    "resource": SEOSlug.ContentType.RESOURCE,
    "industry": SEOSlug.ContentType.INDUSTRY,
}


class PublishService:
    @classmethod
    def transition(cls, tenant_id, page_id, user, target_status: str, *, change_summary: str = "") -> Page:
        page = PageService.get_page(tenant_id, page_id)
        if not can_transition(page.status, target_status):
            from core.exceptions.base import ValidationError

            raise ValidationError(f"Cannot transition from {page.status} to {target_status}")

        if target_status == PageStatus.PUBLISHED:
            return cls.publish(tenant_id, page_id, user, change_summary=change_summary)

        page.status = target_status
        page.updated_by = user
        page.save(update_fields=["status", "updated_by", "updated_at"])
        return page

    @classmethod
    def publish(cls, tenant_id, page_id, user, *, change_summary: str = "") -> Page:
        from content.application.version_service import VersionService

        page = PageService.get_page(tenant_id, page_id)

        if page.scheduled_at and page.scheduled_at > timezone.now():
            page.status = PageStatus.SCHEDULED
            page.updated_by = user
            page.save(update_fields=["status", "updated_by", "updated_at"])
            return page

        version = VersionService.create_version(page, user, change_summary=change_summary)

        page.status = PageStatus.PUBLISHED
        page.published_version = version.version_number
        page.published_at = timezone.now()
        page.updated_by = user
        page.save(update_fields=["status", "published_version", "published_at", "updated_by", "updated_at"])

        content_type = CONTENT_TYPE_MAP.get(page.page_type, SEOSlug.ContentType.LANDING_PAGE)
        SlugService.register_slug(
            tenant_id,
            page.title,
            slug=page.slug,
            locale=page.locale,
            content_type=content_type,
            content_id=page.id,
            path=page.full_path,
        )
        return page

    @classmethod
    def unpublish(cls, tenant_id, page_id, user) -> Page:
        page = PageService.get_page(tenant_id, page_id)
        page.status = PageStatus.UNPUBLISHED
        page.updated_by = user
        page.save(update_fields=["status", "updated_by", "updated_at"])
        return page
