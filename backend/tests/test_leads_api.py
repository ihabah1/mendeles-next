import pytest

from leads.domain.status import LeadStatus
from leads.management.commands.seed_leads import Command as SeedLeads


@pytest.fixture
def leads_seeded(tenant):
    SeedLeads().handle()
    return tenant


@pytest.fixture
def sales_client(api_client, seeded, tenant):
    from conftest import assign_role, auth_client, verify_user
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="sales@test.com",
        password="SecurePass123!",
        first_name="Sales",
        last_name="Mgr",
        default_tenant=tenant,
    )
    verify_user(user)
    assign_role(user, tenant, "sales_manager")
    return auth_client(api_client, user)


@pytest.mark.django_db
def test_list_leads_empty(owner_client, leads_seeded):
    response = owner_client.get("/api/v1/leads/")
    assert response.status_code == 200
    assert response.json()["results"] == []


@pytest.mark.django_db
def test_create_lead_manual(owner_client, leads_seeded):
    response = owner_client.post(
        "/api/v1/leads/",
        {"name": "Jane Doe", "email": "jane@example.com", "phone": "0501234567"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Jane Doe"
    assert response.json()["status"] == LeadStatus.NEW


@pytest.mark.django_db
def test_public_contact_form_endpoint(api_client, leads_seeded, tenant):
    from leads.infrastructure.models import FormDefinition

    form = FormDefinition.objects.filter(tenant=tenant, slug="contact").first()
    response = api_client.get("/api/v1/leads/public/contact-form/")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(form.id)
    assert data["slug"] == "contact"


@pytest.mark.django_db
def test_public_contact_form_auto_creates_when_missing(api_client, tenant):
    from leads.infrastructure.models import FormDefinition

    FormDefinition.objects.filter(tenant=tenant).delete()
    response = api_client.get("/api/v1/leads/public/contact-form/")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "contact"
    assert FormDefinition.objects.filter(tenant=tenant, slug="contact", deleted_at__isnull=True).exists()


@pytest.mark.django_db
def test_public_submit_creates_lead(api_client, leads_seeded, tenant):
    from leads.infrastructure.models import FormDefinition, Lead

    form = FormDefinition.objects.filter(tenant=tenant).first()
    response = api_client.post(
        "/api/v1/leads/public/submit/",
        {
            "formId": str(form.id),
            "pageUrl": "https://example.com/pages/demo",
            "fields": {"name": "Public Lead", "email": "lead@example.com", "message": "Hi"},
            "utm": {"source": "google", "medium": "cpc"},
            "honeypot": "",
        },
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["ok"] is True
    assert Lead.objects.filter(tenant=tenant, email="lead@example.com").exists()


@pytest.mark.django_db
def test_public_submit_creates_inbox_message(api_client, owner_client, leads_seeded, tenant):
    from identity.infrastructure.models import UserInboxMessage
    from leads.infrastructure.models import FormDefinition, Lead

    form = FormDefinition.objects.filter(tenant=tenant, slug="contact").first()
    response = api_client.post(
        "/api/v1/leads/public/submit/",
        {
            "formId": str(form.id),
            "pageUrl": "https://mendeles.com/",
            "fields": {
                "name": "Inbox Lead",
                "email": "inbox-lead@example.com",
                "phone": "0500000000",
                "message": "Please call me",
            },
            "honeypot": "",
        },
        format="json",
    )
    assert response.status_code == 201
    lead = Lead.objects.get(tenant=tenant, email="inbox-lead@example.com")
    messages = UserInboxMessage.objects.filter(tenant=tenant, subject__contains="Inbox Lead")
    assert messages.exists()
    assert str(lead.id) in messages.first().body


@pytest.mark.django_db
def test_public_submit_honeypot_rejected(api_client, leads_seeded, tenant):
    from leads.infrastructure.models import FormDefinition

    form = FormDefinition.objects.filter(tenant=tenant).first()
    response = api_client.post(
        "/api/v1/leads/public/submit/",
        {
            "formId": str(form.id),
            "fields": {"name": "Spam", "email": "spam@example.com"},
            "honeypot": "bot",
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_update_lead_status(owner_client, leads_seeded):
    create = owner_client.post(
        "/api/v1/leads/",
        {"name": "Status Test", "email": "status@example.com"},
        format="json",
    )
    lead_id = create.json()["id"]
    patch = owner_client.patch(
        f"/api/v1/leads/{lead_id}/",
        {"status": LeadStatus.CONTACTED},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.json()["status"] == LeadStatus.CONTACTED


@pytest.mark.django_db
def test_add_note(owner_client, leads_seeded):
    create = owner_client.post(
        "/api/v1/leads/",
        {"name": "Note Test", "email": "note@example.com"},
        format="json",
    )
    lead_id = create.json()["id"]
    note = owner_client.post(
        f"/api/v1/leads/{lead_id}/notes/",
        {"body": "Called the client"},
        format="json",
    )
    assert note.status_code == 201


@pytest.mark.django_db
def test_export_csv(owner_client, leads_seeded):
    owner_client.post(
        "/api/v1/leads/",
        {"name": "Export", "email": "export@example.com"},
        format="json",
    )
    response = owner_client.get("/api/v1/leads/export/")
    assert response.status_code == 200
    assert "text/csv" in response["Content-Type"]
    assert "export@example.com" in response.content.decode()


@pytest.mark.django_db
def test_readonly_cannot_list_leads(readonly_client, leads_seeded):
    response = readonly_client.get("/api/v1/leads/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_sales_manager_can_list(sales_client, leads_seeded):
    response = sales_client.get("/api/v1/leads/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_lead_validation_service():
    from leads.application.lead_service import LeadValidationService
    from core.exceptions.base import ValidationError

    with pytest.raises(ValidationError):
        LeadValidationService.validate_fields(fields={}, fields_schema=[{"key": "name", "required": True}])

    cleaned = LeadValidationService.validate_fields(
        fields={"name": "A", "email": "a@b.com", "phone": ""},
        fields_schema=[{"key": "name", "required": True}, {"key": "email", "required": True}],
    )
    assert cleaned["email"] == "a@b.com"
