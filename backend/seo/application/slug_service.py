from seo.application.settings_service import SEOSettingsService
from seo.domain.transliteration import slugify
from seo.infrastructure.models import SEOSlug


class SlugService:
    @staticmethod
    def generate_slug(text: str) -> str:
        return slugify(text)

    @classmethod
    def is_available(cls, tenant_id, slug: str, locale: str = "he", *, exclude_id=None) -> bool:
        qs = SEOSlug.objects.filter(
            tenant_id=tenant_id,
            slug=slug,
            locale=locale,
            deleted_at__isnull=True,
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return not qs.exists()

    @classmethod
    def generate_unique_slug(
        cls,
        tenant_id,
        text: str,
        *,
        locale: str = "he",
        content_type: str = SEOSlug.ContentType.STATIC,
        content_id=None,
        path: str = "",
    ) -> str:
        base = cls.generate_slug(text)
        candidate = base
        counter = 2
        while not cls.is_available(tenant_id, candidate, locale):
            candidate = f"{base}-{counter}"
            counter += 1
        return candidate

    @classmethod
    def register_slug(
        cls,
        tenant_id,
        text: str,
        *,
        locale: str = "he",
        content_type: str = SEOSlug.ContentType.STATIC,
        content_id=None,
        path: str = "",
        slug: str | None = None,
    ) -> SEOSlug:
        final_slug = slug or cls.generate_unique_slug(
            tenant_id,
            text,
            locale=locale,
            content_type=content_type,
            content_id=content_id,
            path=path,
        )
        if not cls.is_available(tenant_id, final_slug, locale):
            final_slug = cls.generate_unique_slug(
                tenant_id,
                text,
                locale=locale,
                content_type=content_type,
                content_id=content_id,
                path=path,
            )

        obj, _ = SEOSlug.objects.update_or_create(
            tenant_id=tenant_id,
            slug=final_slug,
            locale=locale,
            defaults={
                "content_type": content_type,
                "content_id": content_id,
                "path": path,
                "deleted_at": None,
            },
        )
        return obj

    @classmethod
    def find_duplicate(cls, tenant_id, slug: str, locale: str = "he") -> SEOSlug | None:
        return (
            SEOSlug.objects.filter(
                tenant_id=tenant_id,
                slug=slug,
                locale=locale,
                deleted_at__isnull=True,
            )
            .first()
        )
