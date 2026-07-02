import re
import uuid

from django.db.models import Q

from core.exceptions.base import NotFoundError, ValidationError
from leads.domain.status import LeadActivityType, LeadStatus
from leads.infrastructure.models import Lead, LeadSource, LeadUTM

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LeadValidationService:
    @staticmethod
    def validate_fields(
        *,
        fields: dict,
        fields_schema: list,
    ) -> dict:
        cleaned: dict[str, str] = {}
        schema_by_key = {f.get("key"): f for f in fields_schema if f.get("key")}

        defaults_required = {"name": True, "phone": False, "email": True, "message": False}
        for key in ("name", "phone", "email", "message"):
            value = str(fields.get(key, "") or "").strip()
            rule = schema_by_key.get(key, {})
            required = rule.get("required", defaults_required.get(key, False))
            if required and not value:
                raise ValidationError(f"Field '{key}' is required.")
            if key == "email" and value and not EMAIL_RE.match(value):
                raise ValidationError("Invalid email address.")
            if key == "name" and len(value) > 200:
                raise ValidationError("Name is too long.")
            if key == "message" and len(value) > 5000:
                raise ValidationError("Message is too long.")
            cleaned[key] = value

        if not any(cleaned.get(k) for k in ("name", "phone", "email")):
            raise ValidationError("At least one contact field is required.")

        return cleaned


def _client_meta(request) -> tuple[str | None, str]:
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT", "")
    return ip, ua


class LeadService:
    @staticmethod
    def get_lead(tenant_id, lead_id: uuid.UUID) -> Lead:
        try:
            return Lead.objects.select_related("source", "landing_page", "form", "assigned_to").get(
                id=lead_id,
                tenant_id=tenant_id,
                deleted_at__isnull=True,
            )
        except Lead.DoesNotExist:
            raise NotFoundError("Lead not found.")

    @staticmethod
    def list_leads(
        tenant_id,
        *,
        status: str | None = None,
        source_slug: str | None = None,
        landing_page_id: uuid.UUID | None = None,
        q: str | None = None,
        created_after=None,
        created_before=None,
        sort: str = "-created_at",
    ):
        qs = Lead.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).select_related(
            "source", "landing_page"
        )
        if status:
            qs = qs.filter(status=status)
        if source_slug:
            qs = qs.filter(source__slug=source_slug)
        if landing_page_id:
            qs = qs.filter(landing_page_id=landing_page_id)
        if created_after:
            qs = qs.filter(created_at__gte=created_after)
        if created_before:
            qs = qs.filter(created_at__lte=created_before)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(phone__icontains=q)
                | Q(email__icontains=q)
                | Q(message__icontains=q)
            )
        allowed_sorts = {"created_at", "-created_at", "status", "name", "-name"}
        if sort not in allowed_sorts:
            sort = "-created_at"
        return qs.order_by(sort)

    @staticmethod
    def create_manual(tenant_id, user, data: dict) -> Lead:
        source = LeadSource.objects.filter(tenant_id=tenant_id, slug=data.get("source_slug", "manual")).first()
        if not source:
            source = LeadSource.objects.filter(tenant_id=tenant_id, slug="manual").first()
        if not source:
            raise ValidationError("Lead source not configured.")

        fields = LeadValidationService.validate_fields(
            fields=data,
            fields_schema=[
                {"key": "name", "required": True},
                {"key": "phone"},
                {"key": "email"},
                {"key": "message"},
            ],
        )
        lead = Lead.objects.create(
            tenant_id=tenant_id,
            name=fields.get("name", ""),
            phone=fields.get("phone", ""),
            email=fields.get("email", ""),
            message=fields.get("message", ""),
            status=LeadStatus.NEW,
            source=source,
            page_url=data.get("page_url", ""),
        )
        from leads.application.activity_service import ActivityService

        ActivityService.log(lead, LeadActivityType.CREATED, actor=user, payload={"manual": True})
        return lead

    @staticmethod
    def update_lead(tenant_id, user, lead_id: uuid.UUID, data: dict, request=None) -> Lead:
        lead = LeadService.get_lead(tenant_id, lead_id)
        old_status = lead.status
        for field in ("name", "phone", "email", "message", "page_url", "referrer"):
            if field in data:
                setattr(lead, field, data[field])
        if "status" in data:
            if data["status"] not in LeadStatus.values:
                raise ValidationError("Invalid status.")
            lead.status = data["status"]
        lead.save()

        from leads.application.activity_service import ActivityService
        from leads.application.analytics_hooks import AnalyticsHooks

        payload = {k: v for k, v in data.items() if k in ("name", "phone", "email", "message", "status")}
        if payload:
            ActivityService.log(lead, LeadActivityType.UPDATED, actor=user, payload=payload)
        if "status" in data and data["status"] != old_status:
            ActivityService.log(
                lead,
                LeadActivityType.STATUS_CHANGED,
                actor=user,
                payload={"from": old_status, "to": data["status"]},
            )
            if data["status"] == LeadStatus.CONVERTED:
                AnalyticsHooks.lead_converted(lead)
            AnalyticsHooks.lead_updated(lead, user=user, request=request)

        return lead

    @staticmethod
    def delete_lead(tenant_id, user, lead_id: uuid.UUID, request=None) -> None:
        lead = LeadService.get_lead(tenant_id, lead_id)
        lead.soft_delete()
        from audit.application.audit_service import AuditService

        ip, ua = (None, "")
        if request:
            ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.deleted",
            user=user,
            tenant_id=tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            ip_address=ip,
            user_agent=ua,
        )
