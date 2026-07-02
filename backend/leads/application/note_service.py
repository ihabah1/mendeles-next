from leads.infrastructure.models import Lead, LeadNote


class NoteService:
    @staticmethod
    def add_note(lead: Lead, author, body: str) -> LeadNote:
        note = LeadNote.objects.create(lead=lead, author=author, body=body.strip())
        from leads.application.activity_service import ActivityService
        from leads.domain.status import LeadActivityType

        ActivityService.log(lead, LeadActivityType.NOTE_ADDED, actor=author, payload={"note_id": str(note.id)})
        return note

    @staticmethod
    def list_notes(lead: Lead):
        return lead.notes.select_related("author").filter(deleted_at__isnull=True)
