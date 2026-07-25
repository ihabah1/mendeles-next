import logging
import uuid

from audit.infrastructure.models import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    def _normalize_resource_id(resource_id) -> str | None:
        if resource_id is None or resource_id == "":
            return None
        if isinstance(resource_id, uuid.UUID):
            return str(resource_id)
        return str(resource_id)[:64]

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
    ) -> AuditLog | None:
        """Best-effort audit write — never raises into request handlers."""
        try:
            return AuditLog.objects.create(
                action=action,
                user=user,
                tenant_id=tenant_id,
                resource_type=resource_type,
                resource_id=AuditService._normalize_resource_id(resource_id),
                metadata=dict(metadata or {}),
                ip_address=ip_address,
                user_agent=(user_agent or "")[:500],
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "audit_log_failed action=%s resource_type=%s resource_id=%s",
                action,
                resource_type,
                resource_id,
            )
            return None
