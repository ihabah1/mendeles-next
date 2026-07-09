"""Client content creation requests backed by automation jobs."""

from __future__ import annotations

from automation.application.job_service import JobService
from automation.domain.enums import JobStatus, JobType
from automation.infrastructure.models import AutomationJob
from core.exceptions.base import ValidationError
from leads.infrastructure.models import Lead
from tenancy.application.credit_service import PRODUCT_CREDIT_COST, CreditService

CLIENT_REQUEST_SOURCE = "client_portal"

PRODUCT_TYPES = {
    "landing_page": JobType.GENERATE_LANDING_PAGE,
    "article": JobType.GENERATE_BLOG_ARTICLE,
}

GENERATION_STEPS = [
    {"name": "דאטה", "step_type": "ai_seo.data"},
    {"name": "AI", "step_type": "ai_seo.ai"},
    {"name": "עיצוב", "step_type": "ai_seo.design"},
    {"name": "הקמת דף", "step_type": "ai_seo.page"},
    {"name": "סיום", "step_type": "ai_seo.finish"},
    {"name": "העלאה", "step_type": "ai_seo.publish"},
]

PRODUCT_LABELS = {
    "landing_page": "דף נחיתה",
    "article": "מאמר",
}


def _client_jobs_qs(*, tenant_id=None, user=None, platform_wide: bool = False):
    qs = AutomationJob.objects.filter(
        deleted_at__isnull=True,
        config__request_source=CLIENT_REQUEST_SOURCE,
    ).select_related("created_by", "tenant")
    if not platform_wide:
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        if user:
            qs = qs.filter(created_by=user)
    return qs.order_by("-created_at")


class ClientPortalService:
    @staticmethod
    def serialize_request(job: AutomationJob) -> dict:
        config = job.config or {}
        return {
            "id": str(job.id),
            "product_type": config.get("product_type"),
            "product_label": PRODUCT_LABELS.get(config.get("product_type"), config.get("product_type")),
            "title": config.get("client_title") or job.name,
            "brief": config.get("client_brief") or "",
            "status": job.status,
            "credits_charged": config.get("credits_charged", PRODUCT_CREDIT_COST),
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            "tenant_name": job.tenant.name if hasattr(job, "tenant") and job.tenant_id else None,
            "client_email": job.created_by.email if job.created_by_id else None,
            "client_name": (
                f"{job.created_by.first_name} {job.created_by.last_name}".strip()
                if job.created_by_id
                else None
            ),
        }

    @staticmethod
    def list_requests(*, tenant_id, user, platform_wide: bool = False, limit: int = 50) -> list[dict]:
        qs = _client_jobs_qs(tenant_id=tenant_id, user=None if platform_wide else user, platform_wide=platform_wide)
        return [ClientPortalService.serialize_request(job) for job in qs[:limit]]

    @staticmethod
    def submit_request(*, tenant_id, user, product_type: str, title: str, brief: str, request) -> dict:
        product_type = (product_type or "").strip()
        if product_type not in PRODUCT_TYPES:
            raise ValidationError("סוג מוצר לא תקין — landing_page או article")

        title = (title or "").strip()
        if len(title) < 2:
            raise ValidationError("נדרש כותרת לבקשה")

        brief = (brief or "").strip()

        CreditService.deduct(
            tenant_id=tenant_id,
            amount=PRODUCT_CREDIT_COST,
            reason=f"client_request:{product_type}",
        )

        job_type = PRODUCT_TYPES[product_type]
        label = PRODUCT_LABELS[product_type]
        job = JobService.create_job(
            tenant_id,
            user,
            {
                "job_type": job_type.value,
                "name": f"{label}: {title}",
                "config": {
                    "request_source": CLIENT_REQUEST_SOURCE,
                    "product_type": product_type,
                    "client_title": title,
                    "client_brief": brief,
                    "credits_charged": PRODUCT_CREDIT_COST,
                },
                "steps": GENERATION_STEPS,
                "requires_approval": True,
                "auto_publish_enabled": False,
            },
            request=request,
        )
        return ClientPortalService.serialize_request(job)

    @staticmethod
    def dashboard(*, tenant_id, user, platform_wide: bool = False) -> dict:
        from identity.application.inbox_service import InboxService

        balance = CreditService.get_balance(tenant_id)
        requests = ClientPortalService.list_requests(
            tenant_id=tenant_id,
            user=user,
            platform_wide=platform_wide,
            limit=10,
        )
        pending_count = _client_jobs_qs(
            tenant_id=tenant_id,
            user=None if platform_wide else user,
            platform_wide=platform_wide,
        ).filter(
            status__in=[
                JobStatus.QUEUED,
                JobStatus.SCHEDULED,
                JobStatus.RUNNING,
                JobStatus.WAITING_APPROVAL,
                JobStatus.RETRYING,
            ]
        ).count()

        leads_total = Lead.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).count()
        leads_new = Lead.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
            status="new",
        ).count()

        unread = InboxService.unread_count(tenant_id=tenant_id, user=user)

        if platform_wide:
            pending_platform = AutomationJob.objects.filter(
                deleted_at__isnull=True,
                config__request_source=CLIENT_REQUEST_SOURCE,
                status__in=[
                    JobStatus.QUEUED,
                    JobStatus.SCHEDULED,
                    JobStatus.RUNNING,
                    JobStatus.WAITING_APPROVAL,
                    JobStatus.RETRYING,
                ],
            ).count()
        else:
            pending_platform = pending_count

        return {
            "credits_balance": balance,
            "credit_cost_per_product": PRODUCT_CREDIT_COST,
            "new_client_bonus": 30,
            "requests": requests,
            "pending_requests_count": pending_count,
            "pending_platform_requests_count": pending_platform if platform_wide else None,
            "leads_total": leads_total,
            "leads_new": leads_new,
            "inbox_unread": unread,
        }
