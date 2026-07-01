from content.infrastructure.models import ContentTemplate
from seo.application.slug_service import SlugService


class TemplateService:
    @staticmethod
    def list_templates(tenant_id, *, page_type=None):
        qs = ContentTemplate.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
        if page_type:
            qs = qs.filter(page_type=page_type)
        return qs.order_by("name")

    @staticmethod
    def create_template(tenant_id, data: dict) -> ContentTemplate:
        slug = data.get("slug") or SlugService.generate_slug(data["name"])
        return ContentTemplate.objects.create(
            tenant_id=tenant_id,
            name=data["name"],
            slug=slug,
            description=data.get("description", ""),
            page_type=data.get("page_type", "landing_page"),
            block_schema=data.get("block_schema", []),
            theme_slug=data.get("theme_slug", ""),
            theme_config=data.get("theme_config", {}),
            is_system=data.get("is_system", False),
        )

    @staticmethod
    def serialize_template(template: ContentTemplate) -> dict:
        return {
            "id": str(template.id),
            "name": template.name,
            "slug": template.slug,
            "description": template.description,
            "page_type": template.page_type,
            "block_schema": template.block_schema,
            "theme_slug": template.theme_slug,
            "theme_config": template.theme_config,
            "is_system": template.is_system,
        }
