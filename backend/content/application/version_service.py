from content.infrastructure.models import ContentBlock, Page, PageTerm, PageVersion


class VersionService:
    @staticmethod
    def list_versions(page: Page) -> list[PageVersion]:
        return list(page.versions.filter(deleted_at__isnull=True).order_by("-version_number"))

    @staticmethod
    def create_version(page: Page, user, *, change_summary: str = "") -> PageVersion:
        next_version = page.published_version + 1
        blocks = ContentBlock.objects.filter(page=page, deleted_at__isnull=True).order_by("sort_order")
        terms = PageTerm.objects.filter(page=page, deleted_at__isnull=True).select_related("term", "term__taxonomy")

        return PageVersion.objects.create(
            page=page,
            version_number=next_version,
            status=page.status,
            title=page.title,
            slug=page.slug,
            full_path=page.full_path,
            meta_title=page.meta_title,
            meta_description=page.meta_description,
            blocks_snapshot=[
                {
                    "block_type": b.block_type,
                    "sort_order": b.sort_order,
                    "config": b.config,
                    "is_visible": b.is_visible,
                }
                for b in blocks
            ],
            terms_snapshot=[
                {
                    "term_id": str(pt.term_id),
                    "name": pt.term.name,
                    "slug": pt.term.slug,
                    "taxonomy": pt.term.taxonomy.slug,
                }
                for pt in terms
            ],
            change_summary=change_summary,
            created_by=user,
        )

    @staticmethod
    def serialize_version(version: PageVersion) -> dict:
        return {
            "id": str(version.id),
            "version_number": version.version_number,
            "status": version.status,
            "title": version.title,
            "slug": version.slug,
            "full_path": version.full_path,
            "meta_title": version.meta_title,
            "meta_description": version.meta_description,
            "blocks_snapshot": version.blocks_snapshot,
            "terms_snapshot": version.terms_snapshot,
            "change_summary": version.change_summary,
            "created_at": version.created_at.isoformat(),
        }

    @staticmethod
    def get_version(page: Page, version_number: int) -> PageVersion:
        return page.versions.get(version_number=version_number, deleted_at__isnull=True)
