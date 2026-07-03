"""AI SEO workspace orchestration and Gemini-backed content generation."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from automation.application.job_service import JobService
from automation.application.log_service import AutomationLogService
from automation.domain.enums import JobStatus, JobType, StepStatus
from automation.infrastructure.models import AutomationJob, AutomationJobStep, AutomationQueue
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

GENERATION_STEPS = [
    ("ai_seo.data", "דאטה"),
    ("ai_seo.ai", "AI"),
    ("ai_seo.design", "עיצוב"),
    ("ai_seo.page", "הקמת דף"),
    ("ai_seo.finish", "סיום"),
]


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
        AiSeoGenerationService.recover_stale_jobs(tenant_id)
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
        timeout_seconds = int(getattr(settings, "AI_SEO_STEP_TIMEOUT_SECONDS", 90))
        stale_before = timezone.now() - timedelta(seconds=timeout_seconds)
        active_step = job.steps.filter(status=StepStatus.RUNNING, deleted_at__isnull=True).order_by("step_order").first()
        current_step = active_step or job.steps.filter(deleted_at__isnull=True).order_by("step_order")[job.current_step_index:job.current_step_index + 1].first()
        return {
            "id": str(job.id),
            "name": job.name,
            "job_type": job.job_type,
            "status": job.status,
            "progress_percent": job.progress_percent,
            "current_step_index": job.current_step_index,
            "scheduled_at": job.scheduled_at.isoformat() if job.scheduled_at else None,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "error_message": job.error_message or None,
            "config": job.config,
            "generated_page_id": (job.config or {}).get("generated_page_id"),
            "function": current_step.step_type if current_step else job.job_type,
            "current_step_name": current_step.name if current_step else "",
            "user": job.created_by.email if job.created_by_id else "QSYS",
            "steps": [
                {
                    "id": str(step.id),
                    "name": step.name,
                    "step_type": step.step_type,
                    "status": step.status,
                    "error_message": step.error_message or None,
                    "started_at": step.started_at.isoformat() if step.started_at else None,
                    "is_stale": bool(step.status == StepStatus.RUNNING and step.started_at and step.started_at < stale_before),
                }
                for step in job.steps.filter(deleted_at__isnull=True).order_by("step_order")
            ],
            "logs": [
                {
                    "id": str(log.id),
                    "level": log.level,
                    "message": log.message,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in job.logs.order_by("-created_at")[:12]
            ],
        }

    @staticmethod
    def recover_stale_jobs(tenant_id) -> None:
        timeout_seconds = int(getattr(settings, "AI_SEO_STEP_TIMEOUT_SECONDS", 90))
        stale_before = timezone.now() - timedelta(seconds=timeout_seconds)
        stale_steps = AutomationJobStep.objects.select_related("job").filter(
            job__tenant_id=tenant_id,
            job__status=JobStatus.RUNNING,
            status=StepStatus.RUNNING,
            started_at__lt=stale_before,
            deleted_at__isnull=True,
            job__deleted_at__isnull=True,
        )
        for step in stale_steps:
            message = (
                f"Step timed out after {timeout_seconds}s. "
                "The external provider did not respond in time; retry the step."
            )
            step.status = StepStatus.FAILED
            step.error_message = message
            step.finished_at = timezone.now()
            step.save(update_fields=["status", "error_message", "finished_at", "updated_at"])

            job = step.job
            job.status = JobStatus.FAILED
            job.error_message = message
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at", "updated_at"])
            AutomationLogService.log(job, message, level="error")

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
                        "steps": [
                            {"name": name, "step_type": step_type, "config": {"output_type": output_type}}
                            for step_type, name in GENERATION_STEPS
                        ],
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

    @classmethod
    def execute_generation_step(cls, job: AutomationJob, step: AutomationJobStep, *, execution=None) -> Page | None:
        config = job.config or {}
        step_type = step.step_type

        if step_type == "ai_seo.data":
            keywords = config.get("keywords") or []
            domain = config.get("domain") or {}
            if not keywords:
                raise RuntimeError("No keywords selected for generation.")
            job.config = {
                **config,
                "data_ready": True,
                "data_summary": {
                    "domain": domain.get("label", ""),
                    "keywords_count": len(keywords),
                    "keywords": keywords,
                },
            }
            job.save(update_fields=["config", "updated_at"])
            AutomationLogService.log(
                job,
                f"דאטה מוכן: {len(keywords)} keywords עבור {domain.get('label', '')}",
                execution=execution,
            )
            return None

        if step_type == "ai_seo.ai":
            output_type = config.get("output_type", "blog")
            domain = config.get("domain") or {}
            prompt = cls._build_prompt(
                output_type=output_type,
                domain_label=domain.get("label", ""),
                keywords=config.get("keywords") or [],
                locale=config.get("locale", "he"),
                feedback=config.get("feedback", ""),
                user_prompt=config.get("prompt", ""),
            )
            result = GeminiService.generate_json(prompt)
            job.config = {**config, "gemini_payload": result}
            job.save(update_fields=["config", "updated_at"])
            AutomationLogService.log(job, "Gemini החזיר JSON תקין לתוכן", execution=execution)
            return None

        if step_type == "ai_seo.design":
            payload = config.get("gemini_payload") or {}
            blocks = payload.get("blocks") or []
            if not blocks:
                raise RuntimeError("Gemini response did not include content blocks.")
            designed_blocks = cls._normalize_blocks(blocks)
            job.config = {
                **config,
                "gemini_payload": {**payload, "blocks": designed_blocks},
                "design_ready": True,
            }
            job.save(update_fields=["config", "updated_at"])
            AutomationLogService.log(job, f"עיצוב מוכן: {len(designed_blocks)} blocks", execution=execution)
            return None

        if step_type == "ai_seo.page":
            if config.get("generated_page_id"):
                AutomationLogService.log(job, "טיוטת הדף כבר קיימת, מדלג על יצירה כפולה", execution=execution)
                return None
            payload = config.get("gemini_payload") or {}
            page = cls._create_page_from_payload(job, payload)
            AutomationLogService.log(job, f"הוקם דף טיוטה: {page.title}", execution=execution)
            return page

        if step_type == "ai_seo.finish":
            page_title = (job.config or {}).get("generated_page_title", "")
            AutomationLogService.log(job, f"סיום: התוצר מוכן לבדיקה{f' — {page_title}' if page_title else ''}", execution=execution)
            return None

        raise RuntimeError(f"Unknown AI SEO generation step: {step_type}")

    @staticmethod
    def reset_step_for_retry(job: AutomationJob, step_id: str) -> AutomationJob:
        steps = list(job.steps.filter(deleted_at__isnull=True).order_by("step_order"))
        target = next((step for step in steps if str(step.id) == str(step_id)), None)
        if not target:
            raise RuntimeError("Step not found.")

        for step in steps:
            if step.step_order >= target.step_order:
                step.status = StepStatus.PENDING
                step.error_message = ""
                step.started_at = None
                step.finished_at = None
                step.save(update_fields=["status", "error_message", "started_at", "finished_at", "updated_at"])

        config = job.config or {}
        if target.step_type in {"ai_seo.ai", "ai_seo.design", "ai_seo.page"}:
            config.pop("generated_page_id", None)
            config.pop("generated_page_title", None)
        if target.step_type in {"ai_seo.ai", "ai_seo.design"}:
            config.pop("design_ready", None)
        if target.step_type == "ai_seo.ai":
            config.pop("gemini_payload", None)

        completed_before = len([step for step in steps if step.step_order < target.step_order and step.status == StepStatus.COMPLETED])
        job.config = config
        job.status = JobStatus.RUNNING if completed_before else JobStatus.QUEUED
        job.error_message = ""
        job.finished_at = None
        job.current_step_index = completed_before
        job.progress_percent = int((completed_before / len(steps)) * 100) if steps else 0
        job.save(
            update_fields=[
                "config",
                "status",
                "error_message",
                "finished_at",
                "current_step_index",
                "progress_percent",
                "updated_at",
            ]
        )
        AutomationLogService.log(job, f"Retry requested for step: {target.name}")
        return job

    @classmethod
    def _create_page_from_payload(cls, job: AutomationJob, payload: dict) -> Page:
        config = job.config or {}
        output_type = config.get("output_type", "blog")
        page_type = OUTPUT_TO_PAGE_TYPE.get(output_type, PageType.BLOG)
        domain = config.get("domain") or {}
        page = PageService.create_page(
            job.tenant_id,
            job.created_by,
            {
                "title": payload.get("title") or f"{domain.get('label', 'AI')} — {output_type}",
                "page_type": page_type,
                "locale": config.get("locale", "he"),
                "meta_title": payload.get("meta_title", ""),
                "meta_description": payload.get("meta_description", ""),
            },
        )
        for index, block in enumerate(payload.get("blocks") or [], start=1):
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
    def _normalize_blocks(blocks: list[dict]) -> list[dict]:
        normalized = []
        for block in blocks:
            block_type = block.get("type") or "rich_text"
            config = block.get("config") or {}
            normalized.append({"type": block_type, "config": config})
        return normalized

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
                "steps": [
                    {"name": name, "step_type": step_type, "config": {"output_type": config["output_type"]}}
                    for step_type, name in GENERATION_STEPS
                ],
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
