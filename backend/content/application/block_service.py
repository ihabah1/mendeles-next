from content.application.url_hierarchy_service import UrlHierarchyService
from content.infrastructure.models import ContentBlock, Page


class BlockService:
    @staticmethod
    def list_blocks(page: Page):
        return ContentBlock.objects.filter(page=page, deleted_at__isnull=True).order_by("sort_order")

    @staticmethod
    def create_block(page: Page, data: dict) -> ContentBlock:
        max_order = (
            ContentBlock.objects.filter(page=page, deleted_at__isnull=True)
            .order_by("-sort_order")
            .values_list("sort_order", flat=True)
            .first()
        ) or 0
        return ContentBlock.objects.create(
            page=page,
            block_type=data.get("block_type", "text"),
            sort_order=data.get("sort_order", max_order + 1),
            config=data.get("config", {}),
            is_visible=data.get("is_visible", True),
        )

    @staticmethod
    def update_block(block: ContentBlock, data: dict) -> ContentBlock:
        if "block_type" in data:
            block.block_type = data["block_type"]
        if "sort_order" in data:
            block.sort_order = data["sort_order"]
        if "config" in data:
            block.config = data["config"]
        if "is_visible" in data:
            block.is_visible = data["is_visible"]
        block.save()
        return block

    @staticmethod
    def serialize_block(block: ContentBlock) -> dict:
        return {
            "id": str(block.id),
            "block_type": block.block_type,
            "sort_order": block.sort_order,
            "config": block.config,
            "is_visible": block.is_visible,
        }

    @staticmethod
    def delete_block(block: ContentBlock) -> None:
        block.soft_delete()
