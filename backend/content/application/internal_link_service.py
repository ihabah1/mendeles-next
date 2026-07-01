from content.infrastructure.models import InternalLink, Page


class InternalLinkService:
    @staticmethod
    def list_outbound(page: Page):
        return InternalLink.objects.filter(
            source_page=page,
            deleted_at__isnull=True,
        ).select_related("target_page").order_by("sort_order")

    @staticmethod
    def list_inbound(page: Page):
        return InternalLink.objects.filter(
            target_page=page,
            deleted_at__isnull=True,
        ).select_related("source_page").order_by("sort_order")

    @staticmethod
    def create_link(tenant_id, source_page: Page, data: dict) -> InternalLink:
        target = Page.objects.get(
            id=data["target_page_id"],
            tenant_id=tenant_id,
            deleted_at__isnull=True,
        )
        return InternalLink.objects.create(
            tenant_id=tenant_id,
            source_page=source_page,
            target_page=target,
            link_type=data.get("link_type", "manual"),
            anchor_text=data.get("anchor_text", target.title),
            sort_order=data.get("sort_order", 0),
            is_automatic=data.get("is_automatic", False),
        )

    @staticmethod
    def serialize_link(link: InternalLink) -> dict:
        return {
            "id": str(link.id),
            "source_page_id": str(link.source_page_id),
            "target_page_id": str(link.target_page_id),
            "target_title": link.target_page.title,
            "target_path": link.target_page.full_path,
            "link_type": link.link_type,
            "anchor_text": link.anchor_text,
            "sort_order": link.sort_order,
            "is_automatic": link.is_automatic,
        }

    @staticmethod
    def suggest_links(page: Page, limit: int = 5) -> list[dict]:
        """Architecture-ready: manual links now; automatic/AI suggestions in Phase 3+."""
        links = InternalLinkService.list_outbound(page)[:limit]
        return [InternalLinkService.serialize_link(link) for link in links]

    @staticmethod
    def delete_link(link: InternalLink) -> None:
        link.soft_delete()
