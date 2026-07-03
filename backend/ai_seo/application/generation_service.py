"""AI SEO workspace orchestration and Gemini-backed content generation."""

from __future__ import annotations

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from automation.application.job_service import JobService
from automation.domain.enums import JobStatus, JobType
from automation.infrastructure.models import AutomationJob, AutomationQueue
from content.application.block_service import BlockService
from content.application.page_service import PageService
from content.application.publish_service import PublishService
from content.domain.status import PageStatus, PageType
from content.infrastructure.models import Page
from ai_seo.application.domain_catalog import DOMAIN_OPTIONS, selected_domain_rows
from ai_seo.application.gemini_service import GeminiService


OUTPUT_TO_JOB = {
    "blog": JobType.GENERATE_BLOG_ARTICLE,
    "article": JobType.GENERATE_BLOG_ARTICLE,
    "landing_page": JobType.GENERATE_LANDING_PAGE,
}

OUTPUT_TO_PAGE_TYPE = {
    "blog": PageType.BLOG,
    "article": PageType.BLOG,
    "landing_page": PageType.LANDING_PAGE,
}


def _parse_scheduled_at(value):
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed)
    return parsed


class AiSeoGenerationService:
    @staticmethod
    def workspace_state(tenant_id) -> dict:
        jobs = AutomationJob.objects.filter(
            tenant_id=tenant_id,
            job_type__in=[JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE],
            deleted_at__isnull=True,
        ).order_by("-created_at")[:20]
        pages = Page.objects.filter(
            tenant_id=tenant_id,
            page_type__in=[PageType.BLOG, PageType.LANDING_PAGE],
            deleted_at__isnull=True,
        ).order_by("-created_at")[:30]
        return {
            "domains": DOMAIN_OPTIONS,
            "gemini_configured": GeminiService.configured(),
            "jobs": [AiSeoGenerationService.serialize_job(job) for job in jobs],
            "drafts": [AiSeoGenerationService.serialize_page(page) for page in pages],
        }

    @staticmethod
    def serialize_job(job: AutomationJob) -> dict:
        return {
            "id": str(job.id),
            "name": job.name,
            "job_type": job.job_type,
            "status": job.status,
            "progress_percent": job.progress_percent,
            "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "error_message": job.error_message or None,
            "config": job.config,
            "generated_page_id": (job.config or {}).get("generated_page_id"),
        }

    @staticmethod
    def serialize_page(page: Page) -> dict:
        return {
            "id": str(page.id),
            "title": page.title,
            "page_type": page.page_type,
            "status": page.status,
            "full_path": page.full_path,
            "updated_at": page.updated_at.isoformat() if page.updated_at else None,
            "test_url": f"/dashboard/content?highlight={page.id}",
        }

    @classmethod
    def create_batch(cls, tenant_id, user, data: dict, *, request=None) -> list[AutomationJob]:
        if not GeminiService.configured():
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        domains = selected_domain_rows(data.get("domains") or [])
        if not domains:
            raise RuntimeError("Select at least one domain.")

        output_types = [o for o in (data.get("output_types") or []) if o in OUTPUT_TO_JOB]
        if not output_types:
            raise RuntimeError("Select blog/article and/or landing_page.")

        selected_keywords = data.get("keywords") or []
        manual_prompt = data.get("prompt") or ""
        scheduled_at = _parse_scheduled_at(data.get("scheduled_at"))
        jobs = []
        AutomationQueue.objects.get_or_create(
            tenant_id=tenant_id,
            slug="default",
            defaults={"name": "Default", "is_default": True},
        )

        for domain in domains:
            keywords = selected_keywords or domain["keywords"]
            for output_type in output_types:
                job_type = OUTPUT_TO_JOB[output_type]
                job = JobService.create_job(
                    tenant_id,
                    user,
                    {
                        "name": f"Generate {output_type} — {domain['label']}",
                        "job_type": job_type.value,
                        "config": {
                            "domain": domain,
                            "keywords": keywords,
                            "output_type": output_type,
                            "prompt": manual_prompt,
                            "locale": data.get("locale", "he"),
                        },
                        "requires_approval": True,
                        "auto_publish_enabled": False,
                        "scheduled_at": scheduled_at,
                    },
                    request=request,
                )
                if scheduled_at and scheduled_at > timezone.now():
                    job.status = JobStatus.SCHEDULED
                    job.save(update_fields=["status", "updated_at"])
                else:
                    job = JobService.queue_job(tenant_id, user, job.id, request=request)
                jobs.append(job)
        return jobs

    @classmethod
    def execute_generation_job(cls, job: AutomationJob) -> Page:
        config = job.config or {}
        output_type = config.get("output_type", "blog")
        page_type = OUTPUT_TO_PAGE_TYPE.get(output_type, PageType.BLOG)
        domain = config.get("domain") or {}
        keywords = config.get("keywords") or []
        prompt = cls._build_prompt(
            output_type=output_type,
            domain_label=domain.get("label", ""),
            keywords=keywords,
            locale=config.get("locale", "he"),
            feedback=config.get("feedback", ""),
            user_prompt=config.get("prompt", ""),
        )
        result = GeminiService.generate_json(prompt)
        page = PageService.create_page(
            job.tenant_id,
            job.created_by,
            {
                "title": result.get("title") or f"{domain.get('label', 'AI')} — {output_type}",
                "page_type": page_type,
                "locale": config.get("locale", "he"),
                "meta_title": result.get("meta_title", ""),
                "meta_description": result.get("meta_description", ""),
            },
        )
        for index, block in enumerate(result.get("blocks") or [], start=1):
            BlockService.create_block(
                page,
                {
                    "block_type": block.get("type", "rich_text"),
                    "sort_order": index,
                    "config": block.get("config", {}),
                },
            )
        job.config = {**config, "generated_page_id": str(page.id), "generated_page_title": page.title}
        job.save(update_fields=["config", "updated_at"])
        return page

    @staticmethod
    def _build_prompt(*, output_type: str, domain_label: str, keywords: list[str], locale: str, feedback: str, user_prompt: str) -> str:
        asset = "SEO landing page" if output_type == "landing_page" else "SEO blog article"
        return f"""
Create a production-ready {asset} in Hebrew for the business domain: {domain_label}.
Use only the following real user-selected keywords: {", ".join(keywords)}.
Additional user instructions: {user_prompt or "none"}.
Revision feedback: {feedback or "none"}.

Return strict JSON only:
{{
  "title": "...",
  "meta_title": "...",
  "meta_description": "...",
  "blocks": [
    {{"type": "hero", "config": {{"headline": "...", "subheadline": "...", "cta": "..."}}}},
    {{"type": "rich_text", "config": {{"html": "<h2>...</h2><p>...</p>"}}}},
    {{"type": "faq", "config": {{"items": [{{"question": "...", "answer": "..."}}]}}}},
    {{"type": "cta", "config": {{"headline": "...", "button": "..."}}}}
  ]
}}
Do not invent analytics numbers, prices, testimonials, certifications, or customer names.
Locale: {locale}.
"""

    @classmethod
    def regenerate(cls, tenant_id, user, data: dict, *, request=None) -> AutomationJob:
        page = PageService.get_page(tenant_id, data["page_id"])
        config = {
            "domain": {"label": data.get("domain", page.title), "value": "custom"},
            "keywords": data.get("keywords") or [],
            "output_type": "landing_page" if page.page_type == PageType.LANDING_PAGE else "blog",
            "feedback": data.get("feedback", ""),
            "locale": page.locale,
        }
        job = JobService.create_job(
            tenant_id,
            user,
            {
                "name": f"Regenerate — {page.title}",
                "job_type": OUTPUT_TO_JOB[config["output_type"]].value,
                "config": config,
                "requires_approval": True,
                "auto_publish_enabled": False,
            },
            request=request,
        )
        return JobService.queue_job(tenant_id, user, job.id, request=request)

    @staticmethod
    def publish_page(tenant_id, user, page_id: str) -> Page:
        return PublishService.transition(
            tenant_id,
            page_id,
            user,
            PageStatus.PUBLISHED,
            change_summary="Approved from AI SEO Workspace",
        )
