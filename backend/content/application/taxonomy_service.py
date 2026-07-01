from django.utils import timezone

from content.application.url_hierarchy_service import UrlHierarchyService
from content.infrastructure.models import PageTerm, Taxonomy, TaxonomyTerm
from seo.application.slug_service import SlugService


class TaxonomyService:
    @staticmethod
    def list_taxonomies(tenant_id):
        return Taxonomy.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("name")

    @staticmethod
    def create_taxonomy(tenant_id, data: dict) -> Taxonomy:
        slug = data.get("slug") or SlugService.generate_slug(data["name"])
        return Taxonomy.objects.create(
            tenant_id=tenant_id,
            name=data["name"],
            slug=slug,
            kind=data.get("kind", "category"),
            is_hierarchical=data.get("is_hierarchical", True),
            allow_multiple=data.get("allow_multiple", False),
        )

    @staticmethod
    def serialize_taxonomy(taxonomy: Taxonomy) -> dict:
        return {
            "id": str(taxonomy.id),
            "name": taxonomy.name,
            "slug": taxonomy.slug,
            "kind": taxonomy.kind,
            "is_hierarchical": taxonomy.is_hierarchical,
            "allow_multiple": taxonomy.allow_multiple,
        }

    @staticmethod
    def list_terms(tenant_id, taxonomy_id):
        return TaxonomyTerm.objects.filter(
            tenant_id=tenant_id,
            taxonomy_id=taxonomy_id,
            deleted_at__isnull=True,
        ).order_by("sort_order", "name")

    @classmethod
    def create_term(cls, tenant_id, taxonomy_id, data: dict) -> TaxonomyTerm:
        taxonomy = Taxonomy.objects.get(id=taxonomy_id, tenant_id=tenant_id, deleted_at__isnull=True)
        parent = None
        if parent_id := data.get("parent_id"):
            parent = TaxonomyTerm.objects.get(id=parent_id, tenant_id=tenant_id, deleted_at__isnull=True)

        slug = data.get("slug") or SlugService.generate_slug(data["name"])
        full_path = UrlHierarchyService.build_term_path(slug, parent)

        return TaxonomyTerm.objects.create(
            tenant_id=tenant_id,
            taxonomy=taxonomy,
            parent=parent,
            name=data["name"],
            slug=slug,
            full_path=full_path,
            description=data.get("description", ""),
            sort_order=data.get("sort_order", 0),
        )

    @staticmethod
    def serialize_term(term: TaxonomyTerm) -> dict:
        return {
            "id": str(term.id),
            "name": term.name,
            "slug": term.slug,
            "full_path": term.full_path,
            "parent_id": str(term.parent_id) if term.parent_id else None,
            "taxonomy_id": str(term.taxonomy_id),
            "description": term.description,
            "sort_order": term.sort_order,
        }

    @staticmethod
    def assign_term(page, term_id: str) -> PageTerm:
        term = TaxonomyTerm.objects.get(id=term_id, tenant_id=page.tenant_id, deleted_at__isnull=True)
        if not term.taxonomy.allow_multiple:
            now = timezone.now()
            PageTerm.objects.filter(
                page=page,
                term__taxonomy=term.taxonomy,
                deleted_at__isnull=True,
            ).exclude(term=term).update(deleted_at=now)
        obj, _ = PageTerm.objects.update_or_create(
            page=page,
            term=term,
            defaults={"deleted_at": None},
        )
        return obj

    @staticmethod
    def remove_term(page, term_id: str) -> None:
        PageTerm.objects.filter(page=page, term_id=term_id, deleted_at__isnull=True).update(
            deleted_at=timezone.now()
        )
