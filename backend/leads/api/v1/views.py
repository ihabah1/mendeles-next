import uuid
from datetime import datetime

from django.http import HttpResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.application.audit_service import AuditService
from core.exceptions.base import ForbiddenError, ValidationError
from core.pagination import StandardPagination
from core.permissions.base import HasPermission
from core.ratelimit import enforce_rate_limit
from leads.application.export_service import LeadExportService
from leads.application.form_service import FormService
from leads.application.lead_service import LeadService, _client_meta
from leads.application.note_service import NoteService
from leads.domain.status import LeadStatus
from leads.infrastructure.models import LeadUTM


def _check(request, view, permission: str):
    view.required_permission = permission
    if not HasPermission().has_permission(request, view):
        raise ForbiddenError()


def _serialize_lead(lead, *, detail=False) -> dict:
    data = {
        "id": str(lead.id),
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "message": lead.message,
        "status": lead.status,
        "source": lead.source.slug if lead.source_id else None,
        "source_name": lead.source.name if lead.source_id else None,
        "landing_page_id": str(lead.landing_page_id) if lead.landing_page_id else None,
        "landing_page_path": lead.landing_page.full_path if lead.landing_page_id else None,
        "page_url": lead.page_url,
        "referrer": lead.referrer,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }
    if detail:
        data.update(
            {
                "ip_address": lead.ip_address,
                "user_agent": lead.user_agent,
                "form_id": str(lead.form_id) if lead.form_id else None,
                "assigned_to": lead.assigned_to.email if lead.assigned_to_id else None,
            }
        )
        utm = LeadUTM.objects.filter(lead=lead).first()
        data["utm"] = {
            "source": utm.utm_source if utm else "",
            "medium": utm.utm_medium if utm else "",
            "campaign": utm.utm_campaign if utm else "",
            "content": utm.utm_content if utm else "",
            "term": utm.utm_term if utm else "",
        }
        data["activities"] = [
            {
                "id": str(a.id),
                "activity_type": a.activity_type,
                "payload": a.payload,
                "actor": a.actor.email if a.actor_id else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in lead.activities.all()[:50]
        ]
        data["notes"] = [
            {
                "id": str(n.id),
                "body": n.body,
                "author": n.author.email if n.author_id else None,
                "created_at": n.created_at.isoformat(),
            }
            for n in NoteService.list_notes(lead)
        ]
    return data


def _parse_filters(request) -> dict:
    filters: dict = {}
    if request.query_params.get("status"):
        filters["status"] = request.query_params["status"]
    if request.query_params.get("source"):
        filters["source_slug"] = request.query_params["source"]
    if request.query_params.get("landing_page_id"):
        try:
            filters["landing_page_id"] = uuid.UUID(request.query_params["landing_page_id"])
        except ValueError:
            pass
    if request.query_params.get("q"):
        filters["q"] = request.query_params["q"]
    if request.query_params.get("sort"):
        filters["sort"] = request.query_params["sort"]
    if request.query_params.get("created_after"):
        filters["created_after"] = datetime.fromisoformat(request.query_params["created_after"])
    if request.query_params.get("created_before"):
        filters["created_before"] = datetime.fromisoformat(request.query_params["created_before"])
    return filters


class LeadListView(APIView):
    pagination_class = StandardPagination

    def get(self, request):
        _check(request, self, "leads.view")
        filters = _parse_filters(request)
        qs = LeadService.list_leads(request.user.default_tenant_id, **filters)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response([_serialize_lead(lead) for lead in page])

    def post(self, request):
        _check(request, self, "leads.edit")
        lead = LeadService.create_manual(request.user.default_tenant_id, request.user, request.data)
        ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.created",
            user=request.user,
            tenant_id=request.user.default_tenant_id,
            resource_type="lead",
            resource_id=lead.id,
            ip_address=ip,
            user_agent=ua,
        )
        return Response(_serialize_lead(lead, detail=True), status=201)


class LeadDetailView(APIView):
    def get(self, request, lead_id):
        _check(request, self, "leads.view")
        lead = LeadService.get_lead(request.user.default_tenant_id, lead_id)
        return Response(_serialize_lead(lead, detail=True))

    def patch(self, request, lead_id):
        _check(request, self, "leads.edit")
        lead = LeadService.update_lead(
            request.user.default_tenant_id, request.user, lead_id, request.data, request=request
        )
        return Response(_serialize_lead(lead, detail=True))

    def delete(self, request, lead_id):
        _check(request, self, "leads.delete")
        LeadService.delete_lead(request.user.default_tenant_id, request.user, lead_id, request=request)
        return Response(status=204)


class LeadNoteView(APIView):
    def post(self, request, lead_id):
        _check(request, self, "leads.edit")
        lead = LeadService.get_lead(request.user.default_tenant_id, lead_id)
        body = request.data.get("body", "").strip()
        if not body:
            raise ValidationError("Note body is required.")
        note = NoteService.add_note(lead, request.user, body)
        return Response(
            {
                "id": str(note.id),
                "body": note.body,
                "author": request.user.email,
                "created_at": note.created_at.isoformat(),
            },
            status=201,
        )


class LeadExportView(APIView):
    def get(self, request):
        _check(request, self, "leads.export")
        filters = _parse_filters(request)
        csv_data = LeadExportService.export_csv(request.user.default_tenant_id, **filters)
        ip, ua = _client_meta(request)
        AuditService.log(
            action="lead.exported",
            user=request.user,
            tenant_id=request.user.default_tenant_id,
            resource_type="lead",
            metadata={"filters": {k: str(v) for k, v in filters.items()}},
            ip_address=ip,
            user_agent=ua,
        )
        response = HttpResponse(csv_data, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="leads.csv"'
        return response


class LeadStatusListView(APIView):
    def get(self, request):
        _check(request, self, "leads.view")
        return Response({"results": [{"value": s.value, "label": s.label} for s in LeadStatus]})


class FormListView(APIView):
    def get(self, request):
        _check(request, self, "leads.view")
        forms = FormService.list_forms(request.user.default_tenant_id)
        return Response(
            {
                "results": [
                    {
                        "id": str(f.id),
                        "name": f.name,
                        "slug": f.slug,
                        "fields_schema": f.fields_schema,
                    }
                    for f in forms
                ]
            }
        )

    def post(self, request):
        _check(request, self, "leads.manage")
        form = FormService.create_form(request.user.default_tenant_id, request.data)
        return Response({"id": str(form.id), "name": form.name, "slug": form.slug}, status=201)


class PublicContactFormView(APIView):
    """Return the public tenant default contact form id for CTAs / modals."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from tenancy.application.public_tenant import resolve_public_tenant_id
        from leads.application.setup_service import LeadSetupService

        tenant_id = resolve_public_tenant_id()
        if not tenant_id:
            return Response({"error": {"code": "not_found", "message": "Contact form not found"}}, status=404)

        form = LeadSetupService.get_or_create_public_contact_form(tenant_id)
        return Response({"id": str(form.id), "name": form.name, "slug": form.slug})


class PublicLeadSubmitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        limited = enforce_rate_limit(request, group="lead_submit", rate="5/h")
        if limited:
            return limited
        form_id = request.data.get("formId") or request.data.get("form_id")
        if not form_id:
            raise ValidationError("formId is required.")
        try:
            form_uuid = uuid.UUID(str(form_id))
        except ValueError:
            raise ValidationError("Invalid formId.")
        FormService.submit_public(form_id=form_uuid, data=request.data, request=request)
        return Response({"ok": True}, status=201)
