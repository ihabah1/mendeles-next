import os

from tenancy.infrastructure.models import Tenant


def resolve_public_tenant_id() -> str | None:
    slug = os.environ.get("SEO_PUBLIC_TENANT_SLUG", "")
    if slug:
        tenant = Tenant.objects.filter(slug=slug, deleted_at__isnull=True).first()
        return str(tenant.id) if tenant else None
    tenant = Tenant.objects.filter(deleted_at__isnull=True, status="active").order_by("created_at").first()
    return str(tenant.id) if tenant else None
