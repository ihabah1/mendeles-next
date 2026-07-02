import uuid

from content.infrastructure.models import Page
from core.exceptions.base import NotFoundError, ValidationError
from leads.application.lead_service import LeadValidationService, _client_meta
from leads.domain.status import LeadActivityType, LeadStatus
from leads.infrastructure.models import FormDefinition, FormSubmission, Lead, LeadSource, LeadUTM


class FormService:
    @staticmethod
    def get_form(form_id: uuid.UUID) -> FormDefinition:
        try:
            return FormDefinition.objects.select_related("tenant").get(id=form_id, deleted_at__isnull=True)
        except FormDefinition.DoesNotExist:
            raise NotFoundError("Form not found.")

    @staticmethod
    def list_forms(tenant_id):
        return FormDefinition.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("name")

    @staticmethod
    def create_form(tenant_id, data: dict) -> FormDefinition:
        return FormDefinition.objects.create(
            tenant_id=tenant_id,
            name=data["name"],
            slug=data["slug"],
            fields_schema=data.get("fields_schema", FormService.default_fields_schema()),
            spam_protection=data.get("spam_protection", {"honeypot": True, "rate_limit": 5}),
            duplicate_policy=data.get("duplicate_policy", "allow"),
        )

    @staticmethod
    def default_fields_schema() -> list:
        return [
            {"key": "name", "label": "Name", "required": True},
            {"key": "phone", "label": "Phone", "required": False},
            {"key": "email", "label": "Email", "required": True},
            {"key": "message", "label": "Message", "required": False},
        ]

    @staticmethod
    def submit_public(*, form_id: uuid.UUID, data: dict, request) -> Lead:
        form = FormService.get_form(form_id)
        tenant_id = form.tenant_id

        honeypot = (data.get("honeypot") or "").strip()
        if honeypot:
            raise ValidationError("Spam detected.")

        fields = LeadValidationService.validate_fields(
            fields=data.get("fields", {}),
            fields_schema=form.fields_schema or FormService.default_fields_schema(),
        )

        utm = data.get("utm") or {}
        page_id = data.get("pageId") or data.get("page_id")
        landing_page = None
        if page_id:
            landing_page = Page.objects.filter(id=page_id, tenant_id=tenant_id, deleted_at__isnull=True).first()

        source = LeadSource.objects.filter(tenant_id=tenant_id, slug="landing_page_form").first()
        if not source:
            raise ValidationError("Lead source not configured.")

        ip, ua = _client_meta(request)
        referrer = request.META.get("HTTP_REFERER", "") or data.get("referrer", "")

        submission = FormSubmission.objects.create(
            form=form,
            raw_payload=data,
        )

        lead = Lead.objects.create(
            tenant_id=tenant_id,
            name=fields.get("name", ""),
            phone=fields.get("phone", ""),
            email=fields.get("email", ""),
            message=fields.get("message", ""),
            status=LeadStatus.NEW,
            source=source,
            landing_page=landing_page,
            page_url=data.get("pageUrl") or data.get("page_url", ""),
            form=form,
            ip_address=ip,
            user_agent=ua,
            referrer=referrer[:500] if referrer else "",
        )
        submission.lead = lead
        submission.save(update_fields=["lead"])

        LeadUTM.objects.create(
            lead=lead,
            utm_source=(utm.get("source") or "")[:200],
            utm_medium=(utm.get("medium") or "")[:200],
            utm_campaign=(utm.get("campaign") or "")[:200],
            utm_content=(utm.get("content") or "")[:200],
            utm_term=(utm.get("term") or "")[:200],
        )

        from leads.application.activity_service import ActivityService
        from leads.application.analytics_hooks import AnalyticsHooks

        ActivityService.log(lead, LeadActivityType.FORM_SUBMITTED, actor=None, payload={"form_id": str(form_id)})
        ActivityService.log(lead, LeadActivityType.CREATED, actor=None, payload={"source": source.slug})
        AnalyticsHooks.form_submitted(lead, request=request)
        AnalyticsHooks.lead_created(lead, request=request)

        return lead
