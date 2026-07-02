import pytest

from leads.application.export_service import LeadExportService
from leads.application.note_service import NoteService
from leads.domain.status import LeadStatus
from leads.infrastructure.models import Lead


@pytest.mark.django_db
def test_note_service_add_and_list(owner_user, tenant):
    from leads.infrastructure.models import LeadSource
    from leads.management.commands.seed_leads import Command as SeedLeads

    SeedLeads().handle()
    source = LeadSource.objects.filter(tenant=tenant).first()
    lead = Lead.objects.create(
        tenant=tenant,
        name="Note Lead",
        email="note-svc@example.com",
        status=LeadStatus.NEW,
        source=source,
    )
    note = NoteService.add_note(lead, owner_user, "First note")
    notes = NoteService.list_notes(lead)
    assert len(notes) == 1
    assert notes[0].body == "First note"
    assert note.author_id == owner_user.id


@pytest.mark.django_db
def test_export_service_csv(tenant):
    from leads.infrastructure.models import LeadSource
    from leads.management.commands.seed_leads import Command as SeedLeads

    SeedLeads().handle()
    source = LeadSource.objects.filter(tenant=tenant).first()
    Lead.objects.create(
        tenant=tenant,
        name="CSV Lead",
        email="csv@example.com",
        phone="0501111111",
        status=LeadStatus.NEW,
        source=source,
    )
    csv_data = LeadExportService.export_csv(tenant.id)
    assert "csv@example.com" in csv_data
    assert "CSV Lead" in csv_data
