from audit.application.audit_service import AuditService
from leads.application.lead_service import _client_meta
from leads.infrastructure.models import Lead


class AnalyticsHooks:
    """Event hooks — no dashboard; audit + activity only."""

    @staticmethod
    def lead_created(lead: Lead, *, request=None) -> None:
        ip, ua = (None, "")
        if request:
            ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.created",
            user=None,
            tenant_id=lead.tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            metadata={"source": lead.source.slug if lead.source_id else None},
            ip_address=ip,
            user_agent=ua,
        )

    @staticmethod
    def lead_updated(lead: Lead, *, user=None, request=None) -> None:
        ip, ua = (None, "")
        if request:
            ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.updated",
            user=user,
            tenant_id=lead.tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            ip_address=ip,
            user_agent=ua,
        )

    @staticmethod
    def lead_converted(lead: Lead) -> None:
        AuditService.log(
            action="lead.converted",
            user=None,
            tenant_id=lead.tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            metadata={"status": lead.status},
        )

    @staticmethod
    def form_submitted(lead: Lead, *, request=None) -> None:
        ip, ua = (None, "")
        if request:
            ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.form_submitted",
            user=None,
            tenant_id=lead.tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            ip_address=ip,
            user_agent=ua,
        )
