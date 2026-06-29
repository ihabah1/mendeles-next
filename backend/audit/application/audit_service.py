from audit.infrastructure.models import AuditLog


class AuditService:
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
        return AuditLog.objects.create(
            action=action,
            user=user,
            tenant_id=tenant_id,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent[:500],
        )
