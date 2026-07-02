import csv
import io

from leads.application.lead_service import LeadService


class LeadExportService:
    @staticmethod
    def export_csv(tenant_id, **filters) -> str:
        leads = LeadService.list_leads(tenant_id, **filters).select_related("source", "landing_page", "utm")
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "id",
                "name",
                "phone",
                "email",
                "message",
                "status",
                "source",
                "landing_page",
                "page_url",
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_content",
                "utm_term",
                "created_at",
            ]
        )
        for lead in leads[:10000]:
            utm = getattr(lead, "utm", None)
            writer.writerow(
                [
                    str(lead.id),
                    lead.name,
                    lead.phone,
                    lead.email,
                    lead.message,
                    lead.status,
                    lead.source.slug if lead.source_id else "",
                    lead.landing_page.full_path if lead.landing_page_id else "",
                    lead.page_url,
                    utm.utm_source if utm else "",
                    utm.utm_medium if utm else "",
                    utm.utm_campaign if utm else "",
                    utm.utm_content if utm else "",
                    utm.utm_term if utm else "",
                    lead.created_at.isoformat() if lead.created_at else "",
                ]
            )
        return output.getvalue()
