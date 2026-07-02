from leads.domain.status import LeadActivityType
from leads.infrastructure.models import Lead, LeadActivity


class ActivityService:
    @staticmethod
    def log(lead: Lead, activity_type: str, *, actor=None, payload: dict | None = None) -> LeadActivity:
        return LeadActivity.objects.create(
            lead=lead,
            activity_type=activity_type,
            actor=actor,
            payload=payload or {},
        )

    @staticmethod
    def list_for_lead(lead: Lead):
        return lead.activities.select_related("actor").all()
