from seo.infrastructure.models import SEORedirect


class RedirectService:
    """Redirect infrastructure — API-ready, no management UI in Phase 2."""

    @staticmethod
    def list_redirects(tenant_id) -> list[dict]:
        return [
            {
                "id": str(r.id),
                "from_path": r.from_path,
                "to_path": r.to_path,
                "status_code": r.status_code,
                "is_active": r.is_active,
            }
            for r in SEORedirect.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("from_path")
        ]

    @staticmethod
    def create_redirect(tenant_id, *, from_path: str, to_path: str, status_code: int = 301) -> dict:
        obj, _ = SEORedirect.objects.update_or_create(
            tenant_id=tenant_id,
            from_path=from_path,
            defaults={
                "to_path": to_path,
                "status_code": status_code,
                "is_active": True,
                "deleted_at": None,
            },
        )
        return {
            "id": str(obj.id),
            "from_path": obj.from_path,
            "to_path": obj.to_path,
            "status_code": obj.status_code,
            "is_active": obj.is_active,
        }

    @staticmethod
    def resolve(tenant_id, path: str) -> dict | None:
        redirect = (
            SEORedirect.objects.filter(
                tenant_id=tenant_id,
                from_path=path,
                is_active=True,
                deleted_at__isnull=True,
            )
            .first()
        )
        if not redirect:
            return None
        return {
            "to_path": redirect.to_path,
            "status_code": redirect.status_code,
        }
