import uuid

from audit.infrastructure.models import AuditLog


class AuditService:
    @staticmethod
    def _coerce_resource_id(resource_id):
        if resource_id is None or resource_id == "":
            return None
        if isinstance(resource_id, uuid.UUID):
            return resource_id
        try:
            return uuid.UUID(str(resource_id))
        except (ValueError, TypeError, AttributeError):
            return None

    @staticmethod
    def log(
        *,
        action: str,
        user=None,
        tenant_id=None,
        resource_type: str | None = None,
        resource_id=None,
        metadata: dict | None = None,
        ip_address: str | None = None,
        user_agent: str = "",
    ) -> AuditLog:
        meta = dict(metadata or {})
        coerced = AuditService._coerce_resource_id(resource_id)
        # Preserve non-UUID identifiers in metadata instead of crashing create().
        if resource_id not in (None, "") and coerced is None:
            meta.setdefault("resource_key", str(resource_id))
        return AuditLog.objects.create(
            action=action,
            user=user,
            tenant_id=tenant_id,
            resource_type=resource_type,
            resource_id=coerced,
            metadata=meta,
            ip_address=ip_address,
            user_agent=user_agent[:500],
        )
