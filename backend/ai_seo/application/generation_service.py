"""AI SEO workspace orchestration and Gemini-backed content generation."""

from __future__ import annotations

import random
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
from content.application.taxonomy_service import TaxonomyService
from content.domain.status import PageStatus, PageType
from content.infrastructure.models import Page, Taxonomy, TaxonomyTerm
from ai_seo.application.domain_catalog import DOMAIN_OPTIONS, selected_domain_rows
from ai_seo.application.gemini_service import GeminiService
from integrations.application.trends_service import TrendsService
from integrations.domain.enums import GoogleServiceType, TrendsCountry, TrendsDateRange
from integrations.infrastructure.models import IntegrationSyncRecord


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

RECURRENCE_INTERVALS = {
    "hourly": timedelta(hours=1),
    "every_6_hours": timedelta(hours=6),
    "every_24_hours": timedelta(hours=24),
    "every_2_days": timedelta(days=2),
}

GENERATION_STEPS = [
    ("ai_seo.data", "דאטה"),
    ("ai_seo.ai", "AI"),
    ("ai_seo.design", "עיצוב"),
    ("ai_seo.page", "הקמת דף"),
    ("ai_seo.finish", "סיום"),
    ("ai_seo.publish", "העלאה לפרודקשן"),
]

FREE_STOCK_IMAGES = [
    {
        "url": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
        "alt": "Modern business workspace",
        "source": "Unsplash",
        "license": "Unsplash License - free for commercial use",
    },
    {
        "url": "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80",
        "alt": "Business team planning growth",
        "source": "Unsplash",
        "license": "Unsplash License - free for commercial use",
    },
    {
        "url": "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
        "alt": "Digital marketing and product team",
        "source": "Unsplash",
        "license": "Unsplash License - free for commercial use",
    },
    {
        "url": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80",
        "alt": "Professional consultation meeting",
        "source": "Unsplash",
        "license": "Unsplash License - free for commercial use",
    },
]

DOMAIN_STOCK_IMAGES = {
    "insurance": [
        {
            "url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
            "alt": "Car on an open road for auto insurance content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        },
        {
            "url": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=80",
            "alt": "Driver holding steering wheel for vehicle insurance content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        },
    ],
    "automotive": [
        {
            "url": "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=80",
            "alt": "Modern car for automotive services content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "real_estate": [
        {
            "url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
            "alt": "Modern home exterior for real estate content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "medical": [
        {
            "url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80",
            "alt": "Medical clinic equipment for healthcare content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "dentistry": [
        {
            "url": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1600&q=80",
            "alt": "Dental clinic for dentistry content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "law": [
        {
            "url": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=80",
            "alt": "Legal books and gavel for law content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "finance": [
        {
            "url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
            "alt": "Financial planning paperwork for finance content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
    "home_services": [
        {
            "url": "https://images.unsplash.com/photo-1581091215367-59ab6b4a9f5c?auto=format&fit=crop&w=1600&q=80",
            "alt": "Home repair tools for home services content",
            "source": "Unsplash",
            "license": "Unsplash License - free for commercial use",
        }
    ],
}

LANDING_THEMES = [
    {"slug": "cyan-growth", "label": "Growth Cyan", "accent": "cyan"},
    {"slug": "emerald-trust", "label": "Trust Emerald", "accent": "emerald"},
    {"slug": "violet-premium", "label": "Premium Violet", "accent": "violet"},
    {"slug": "amber-conversion", "label": "Conversion Amber", "accent": "amber"},
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
    def _select_domains_for_run(values: list[str], *, random_topics_enabled: bool, random_topic_count: int) -> list[dict]:
        pool = selected_domain_rows(values) if values else DOMAIN_OPTIONS
        if not random_topics_enabled:
            return selected_domain_rows(values)
        count = min(random_topic_count, len(pool))
        return random.sample(pool, count) if count else []

    @staticmethod
    def _select_keywords_for_run(domain: dict, selected_keywords: list[str], *, random_topics_enabled: bool) -> list[str]:
        if selected_keywords and not random_topics_enabled:
            return selected_keywords
        keywords = list(domain.get("keywords") or selected_keywords or [])
        if random_topics_enabled and len(keywords) > 1:
            return random.sample(keywords, min(3, len(keywords)))
        return keywords

    @staticmethod
    def _random_visual_asset(domain: dict | None = None) -> dict:
        domain_value = (domain or {}).get("value", "")
        pool = DOMAIN_STOCK_IMAGES.get(domain_value) or FREE_STOCK_IMAGES
        asset = dict(random.choice(pool))
        asset["matched_domain"] = domain_value or "general"
        return asset

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
            "history": AiSeoGenerationService.run_history(tenant_id),
        }

    @classmethod
    def seo_research(cls, tenant_id, *, refresh=False, domains: list[str] | None = None, keywords: list[str] | None = None) -> dict:
        seed_domains = selected_domain_rows(domains or [])
        seed_keywords = keywords or []
        if not seed_keywords:
            seed_keywords = list(dict.fromkeys([kw for domain in (seed_domains or DOMAIN_OPTIONS[:5]) for kw in domain["keywords"]]))[:5]

        refresh_error = ""
        if refresh and seed_keywords:
            try:
                TrendsService.sync(
                    tenant_id,
                    keywords=seed_keywords[:5],
                    country=TrendsCountry.ISRAEL,
                    date_range=TrendsDateRange.HOURS_24,
                    language="he",
                )
            except Exception as exc:
                refresh_error = str(exc)

        trends = cls._latest_integration_sync(tenant_id, GoogleServiceType.TRENDS)
        gsc = cls._latest_integration_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        rows: list[dict] = []
        seen = set()

        def add_row(keyword: str, *, category: dict | None, volume, source: str, metric: str):
            normalized = (keyword or "").strip()
            if not normalized or normalized in seen:
                return
            seen.add(normalized)
            rows.append(
                {
                    "id": f"{source}:{len(rows)}:{normalized}",
                    "keyword": normalized,
                    "volume": volume,
                    "volume_metric": metric,
                    "category": (category or {}).get("label") or "כללי",
                    "category_value": (category or {}).get("value") or "",
                    "source": source,
                }
            )

        if trends:
            processed = trends.processed_data or {}
            related_queries = processed.get("related_queries") or {}
            for seed, query_groups in related_queries.items():
                category = cls._category_for_keyword(seed)
                groups = query_groups if isinstance(query_groups, dict) else {"top": query_groups}
                for group_rows in groups.values():
                    for row in group_rows or []:
                        if isinstance(row, dict):
                            add_row(
                                row.get("query", ""),
                                category=category,
                                volume=row.get("value"),
                                source="google_trends",
                                metric="trends_score_0_100",
                            )
            for row in (processed.get("trending_searches") or []):
                term = row[0] if isinstance(row, (list, tuple)) and row else str(row)
                add_row(
                    term,
                    category=cls._category_for_keyword(term),
                    volume=None,
                    source="google_trends",
                    metric="trending_now_no_absolute_volume",
                )

        if gsc:
            for query in (gsc.processed_data or {}).get("queries") or []:
                add_row(
                    query.get("query", ""),
                    category=cls._category_for_keyword(query.get("query", "")),
                    volume=query.get("impressions"),
                    source="search_console",
                    metric="impressions",
                )

        rows.sort(key=lambda item: (item["volume"] is not None, item["volume"] or 0), reverse=True)
        last_sync_at = None
        for record in (trends, gsc):
            if record and (not last_sync_at or record.retrieved_at > last_sync_at):
                last_sync_at = record.retrieved_at

        return {
            "available": bool(rows),
            "last_sync_at": last_sync_at.isoformat() if last_sync_at else None,
            "refresh_error": refresh_error,
            "items": rows[:20],
            "note": "Google Trends returns relative scores, not absolute monthly search volume. Search Console rows use real impressions.",
        }

    @staticmethod
    def _latest_integration_sync(tenant_id, service_type: str):
        return (
            IntegrationSyncRecord.objects.filter(
                tenant_id=tenant_id,
                service_type=service_type,
                deleted_at__isnull=True,
            )
            .order_by("-retrieved_at")
            .first()
        )

    @staticmethod
    def _category_for_keyword(keyword: str) -> dict | None:
        value = (keyword or "").lower()
        for domain in DOMAIN_OPTIONS:
            domain_terms = [domain["label"], domain["value"], *(domain.get("keywords") or [])]
            if any((term or "").lower() in value or value in (term or "").lower() for term in domain_terms):
                return domain
        return None

    @staticmethod
    def run_history(tenant_id, *, limit=12) -> list[dict]:
        jobs = AutomationJob.objects.filter(
            tenant_id=tenant_id,
            job_type__in=[JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE],
            deleted_at__isnull=True,
        ).order_by("-created_at")[:80]
        seen = set()
        history = []
        for job in jobs:
            config = job.config or {}
            domain = config.get("domain") or {}
            key = (
                domain.get("value", ""),
                tuple(config.get("keywords") or []),
                config.get("output_type", ""),
                config.get("recurrence_interval", ""),
                bool(config.get("auto_publish_enabled")),
                bool(config.get("random_topics_enabled")),
            )
            if key in seen:
                continue
            seen.add(key)
            history.append(
                {
                    "id": str(job.id),
                    "label": f"{domain.get('label', 'נושא')} · {config.get('output_type', 'תוצר')} · {job.created_at.strftime('%d/%m %H:%M') if job.created_at else ''}",
                    "domains": config.get("source_domain_values") or ([domain.get("value")] if domain.get("value") else []),
                    "keywords": config.get("keywords") or [],
                    "output_types": [config.get("output_type")] if config.get("output_type") else [],
                    "prompt": config.get("prompt", ""),
                    "recurrence_interval": config.get("recurrence_interval", ""),
                    "auto_publish_enabled": bool(config.get("auto_publish_enabled")),
                    "random_topics_enabled": bool(config.get("random_topics_enabled")),
                    "random_topic_count": int(config.get("random_topic_count") or 1),
                    "landing_design_enabled": bool(config.get("landing_design_enabled", True)),
                    "free_image_enabled": bool(config.get("free_image_enabled", True)),
                    "publish_at": config.get("publish_at") or "",
                }
            )
            if len(history) >= limit:
                break
        return history

    @staticmethod
    def serialize_job(job: AutomationJob) -> dict:
        timeout_seconds = int(getattr(settings, "AI_SEO_STEP_TIMEOUT_SECONDS", 90))
        max_retries = int(getattr(settings, "AI_SEO_STEP_MAX_RETRIES", 3))
        stale_before = timezone.now() - timedelta(seconds=timeout_seconds)
        retry_counts = (job.config or {}).get("step_retry_counts", {})
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
            "published_page_id": (job.config or {}).get("auto_published_page_id") or (job.config or {}).get("published_page_id"),
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
                    "retry_count": int(retry_counts.get(str(step.id), 0)),
                    "max_retries": max_retries,
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
        max_retries = int(getattr(settings, "AI_SEO_STEP_MAX_RETRIES", 3))
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
            job = step.job
            config = job.config or {}
            retry_counts = config.get("step_retry_counts", {})
            step_key = str(step.id)
            attempts = int(retry_counts.get(step_key, 0))
            if attempts < max_retries:
                retry_counts[step_key] = attempts + 1
                config["step_retry_counts"] = retry_counts
                step.error_message = f"Auto retry {attempts + 1}/{max_retries} after {timeout_seconds}s timeout."
                step.started_at = None
                step.finished_at = None
                step.save(update_fields=["error_message", "started_at", "finished_at", "updated_at"])
                job.config = config
                job.status = JobStatus.RUNNING
                job.error_message = ""
                job.finished_at = None
                job.save(update_fields=["config", "status", "error_message", "finished_at", "updated_at"])
                AutomationLogService.log(
                    job,
                    f"Auto retry {attempts + 1}/{max_retries} scheduled for step: {step.name}",
                    level="warning",
                )
                continue

            message = (
                f"Step timed out after {timeout_seconds}s. "
                f"Auto retry limit reached ({max_retries}); retry the step manually."
            )
            step.status = StepStatus.FAILED
            step.error_message = message
            step.finished_at = timezone.now()
            step.save(update_fields=["status", "error_message", "finished_at", "updated_at"])

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
            "meta_title": page.meta_title,
            "meta_description": page.meta_description,
            "published_at": page.published_at.isoformat() if page.published_at else None,
            "scheduled_at": page.scheduled_at.isoformat() if page.scheduled_at else None,
            "updated_at": page.updated_at.isoformat() if page.updated_at else None,
            "test_url": f"/dashboard/content?highlight={page.id}",
            "source_job_id": str(source_job.id) if (source_job := AiSeoGenerationService._source_job_for_page(page)) else None,
            "category": AiSeoGenerationService._page_category(page),
            "image": AiSeoGenerationService._page_image(page),
            "blocks": [
                {
                    "id": str(block.id),
                    "type": block.block_type,
                    "config": block.config,
                }
                for block in page.blocks.filter(deleted_at__isnull=True, is_visible=True).order_by("sort_order")
            ],
        }

    @classmethod
    def create_batch(cls, tenant_id, user, data: dict, *, request=None) -> list[AutomationJob]:
        if not GeminiService.configured():
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        requested_domain_values = data.get("domains") or []
        random_topics_enabled = bool(data.get("random_topics_enabled", False))
        random_topic_count = max(1, min(int(data.get("random_topic_count") or 1), 6))
        domains = cls._select_domains_for_run(
            requested_domain_values,
            random_topics_enabled=random_topics_enabled,
            random_topic_count=random_topic_count,
        )
        if not domains:
            raise RuntimeError("Select at least one domain or enable random topics.")

        output_types = [o for o in (data.get("output_types") or []) if o in OUTPUT_TO_JOB]
        if not output_types:
            raise RuntimeError("Select blog/article and/or landing_page.")

        selected_keywords = data.get("keywords") or []
        manual_prompt = data.get("prompt") or ""
        scheduled_at = _parse_scheduled_at(data.get("scheduled_at"))
        publish_at = _parse_scheduled_at(data.get("publish_at"))
        recurrence_interval = data.get("recurrence_interval") or ""
        auto_publish_enabled = bool(data.get("auto_publish_enabled", False))
        landing_design_enabled = bool(data.get("landing_design_enabled", True))
        free_image_enabled = bool(data.get("free_image_enabled", True))
        jobs = []
        AutomationQueue.objects.get_or_create(
            tenant_id=tenant_id,
            slug="default",
            defaults={"name": "Default", "is_default": True},
        )

        for domain in domains:
            keywords = cls._select_keywords_for_run(domain, selected_keywords, random_topics_enabled=random_topics_enabled)
            for output_type in output_types:
                job_type = OUTPUT_TO_JOB[output_type]
                visual_asset = cls._random_visual_asset(domain) if free_image_enabled else None
                landing_theme = random.choice(LANDING_THEMES) if landing_design_enabled else None
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
                            "recurrence_interval": recurrence_interval,
                            "auto_publish_enabled": auto_publish_enabled,
                            "publish_at": publish_at.isoformat() if publish_at else "",
                            "source_domain_values": requested_domain_values,
                            "random_topics_enabled": random_topics_enabled,
                            "random_topic_count": random_topic_count,
                            "landing_design_enabled": landing_design_enabled,
                            "free_image_enabled": free_image_enabled,
                            "visual_asset": visual_asset,
                            "landing_theme": landing_theme,
                        },
                        "requires_approval": not auto_publish_enabled,
                        "auto_publish_enabled": auto_publish_enabled,
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
        return cls._create_page_from_payload(job, result)

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
            keywords = config.get("keywords") or []
            AutomationLogService.log(
                job,
                f"AI request starting: output={output_type}, domain={domain.get('label', '')}, keywords={len(keywords)}",
                execution=execution,
            )
            prompt = cls._build_prompt(
                output_type=output_type,
                domain_label=domain.get("label", ""),
                keywords=keywords,
                locale=config.get("locale", "he"),
                feedback=config.get("feedback", ""),
                user_prompt=config.get("prompt", ""),
            )
            result = GeminiService.generate_json(prompt)
            job.config = {**config, "gemini_payload": result}
            job.save(update_fields=["config", "updated_at"])
            AutomationLogService.log(
                job,
                f"Gemini returned JSON: title={result.get('title', '')}, blocks={len(result.get('blocks') or [])}",
                execution=execution,
            )
            return None

        if step_type == "ai_seo.design":
            payload = config.get("gemini_payload") or {}
            blocks = payload.get("blocks") or []
            if not blocks:
                raise RuntimeError("Gemini response did not include content blocks.")
            AutomationLogService.log(job, f"Design normalization starting for {len(blocks)} blocks", execution=execution)
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
            AutomationLogService.log(job, f"Draft page creation starting: {payload.get('title', '')}", execution=execution)
            page = cls._create_page_from_payload(job, payload)
            AutomationLogService.log(job, f"הוקם דף טיוטה: {page.title}", execution=execution)
            return page

        if step_type == "ai_seo.finish":
            page_title = (job.config or {}).get("generated_page_title", "")
            AutomationLogService.log(job, f"סיום: התוצר מוכן לבדיקה{f' — {page_title}' if page_title else ''}", execution=execution)
            return None

        if step_type == "ai_seo.publish":
            if job.auto_publish_enabled or config.get("auto_publish_enabled") or config.get("manual_publish_requested"):
                page = cls._auto_publish_generated_page(job, execution=execution)
                config = job.config or {}
                config.pop("manual_publish_requested", None)
                job.config = config
                job.save(update_fields=["config", "updated_at"])
                cls._schedule_next_recurring_job(job, execution=execution)
                AutomationLogService.log(job, f"העלאה לפרודקשן הושלמה: {page.full_path or page.title}", execution=execution)
                return page

            step.status = StepStatus.WAITING_APPROVAL
            step.error_message = "ממתין לאישור העלאה לפרודקשן"
            step.save(update_fields=["status", "error_message", "updated_at"])
            job.status = JobStatus.WAITING_APPROVAL
            job.error_message = "ממתין לאישור העלאה לפרודקשן"
            job.save(update_fields=["status", "error_message", "updated_at"])
            AutomationLogService.log(job, "העלאה לפרודקשן ממתינה ללחיצת משתמש", execution=execution)
            return None

        raise RuntimeError(f"Unknown AI SEO generation step: {step_type}")

    @staticmethod
    def _auto_publish_generated_page(job: AutomationJob, *, execution=None) -> Page:
        page_id = (job.config or {}).get("generated_page_id")
        if not page_id:
            AutomationLogService.log(job, "Auto publish skipped: no generated page id", level="warning", execution=execution)
            raise RuntimeError("No generated page id found for production upload.")
        page = PageService.get_page(job.tenant_id, page_id)
        if page.status == PageStatus.PUBLISHED:
            AutomationLogService.log(job, f"Auto publish skipped: already published — {page.title}", execution=execution)
            return page
        page = PublishService.transition(
            job.tenant_id,
            page_id,
            job.created_by,
            PageStatus.PUBLISHED,
            change_summary="Auto published from AI SEO Workspace",
        )
        job.config = {
            **(job.config or {}),
            "auto_published_page_id": str(page.id),
            "published_page_id": str(page.id),
            "auto_published_at": timezone.now().isoformat(),
        }
        job.save(update_fields=["config", "updated_at"])
        AutomationLogService.log(job, f"Auto published to production: {page.full_path or page.title}", execution=execution)
        return page

    @staticmethod
    def _schedule_next_recurring_job(job: AutomationJob, *, execution=None) -> None:
        config = job.config or {}
        recurrence_interval = config.get("recurrence_interval") or ""
        interval = RECURRENCE_INTERVALS.get(recurrence_interval)
        if not interval or config.get("next_recurring_job_id"):
            return

        next_config = {
            key: value
            for key, value in config.items()
            if key
            not in {
                "data_ready",
                "data_summary",
                "gemini_payload",
                "design_ready",
                "generated_page_id",
                "generated_page_title",
                "auto_published_page_id",
                "published_page_id",
                "auto_published_at",
                "step_retry_counts",
                "next_recurring_job_id",
            }
        }
        if next_config.get("random_topics_enabled"):
            domains = AiSeoGenerationService._select_domains_for_run(
                next_config.get("source_domain_values") or [],
                random_topics_enabled=True,
                random_topic_count=int(next_config.get("random_topic_count") or 1),
            )
            if domains:
                domain = domains[0]
                next_config["domain"] = domain
                next_config["keywords"] = AiSeoGenerationService._select_keywords_for_run(
                    domain,
                    [],
                    random_topics_enabled=True,
                )
                if next_config.get("free_image_enabled", True):
                    next_config["visual_asset"] = AiSeoGenerationService._random_visual_asset(domain)
                if next_config.get("landing_design_enabled", True):
                    next_config["landing_theme"] = random.choice(LANDING_THEMES)
        next_run_at = timezone.now() + interval
        next_job = JobService.create_job(
            job.tenant_id,
            job.created_by,
            {
                "name": job.name,
                "job_type": job.job_type,
                "queue_id": str(job.queue_id),
                "config": next_config,
                "requires_approval": job.requires_approval,
                "auto_publish_enabled": job.auto_publish_enabled,
                "scheduled_at": next_run_at,
                "parent_job_id": str(job.id),
                "steps": [
                    {"name": name, "step_type": step_type, "config": {"output_type": next_config.get("output_type")}}
                    for step_type, name in GENERATION_STEPS
                ],
            },
        )
        next_job.status = JobStatus.SCHEDULED
        next_job.save(update_fields=["status", "updated_at"])
        job.config = {**config, "next_recurring_job_id": str(next_job.id), "next_recurring_run_at": next_run_at.isoformat()}
        job.save(update_fields=["config", "updated_at"])
        AutomationLogService.log(job, f"Next recurring run scheduled at {next_run_at.isoformat()}", execution=execution)

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
        retry_counts = config.get("step_retry_counts", {})
        for step in steps:
            if step.step_order >= target.step_order:
                retry_counts.pop(str(step.id), None)
        if retry_counts:
            config["step_retry_counts"] = retry_counts
        else:
            config.pop("step_retry_counts", None)

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

    @staticmethod
    def schedule_step_auto_retry(job: AutomationJob, step: AutomationJobStep, reason: str) -> bool:
        max_retries = int(getattr(settings, "AI_SEO_STEP_MAX_RETRIES", 3))
        config = job.config or {}
        retry_counts = config.get("step_retry_counts", {})
        step_key = str(step.id)
        attempts = int(retry_counts.get(step_key, 0))
        if attempts >= max_retries:
            return False

        steps = list(job.steps.filter(deleted_at__isnull=True).order_by("step_order"))
        target = next((item for item in steps if item.id == step.id), step)
        for item in steps:
            if item.step_order >= target.step_order:
                item.status = StepStatus.PENDING
                item.error_message = ""
                item.started_at = None
                item.finished_at = None
                item.save(update_fields=["status", "error_message", "started_at", "finished_at", "updated_at"])

        if target.step_type in {"ai_seo.ai", "ai_seo.design", "ai_seo.page"}:
            config.pop("generated_page_id", None)
            config.pop("generated_page_title", None)
        if target.step_type in {"ai_seo.ai", "ai_seo.design"}:
            config.pop("design_ready", None)
        if target.step_type == "ai_seo.ai":
            config.pop("gemini_payload", None)

        retry_counts[step_key] = attempts + 1
        config["step_retry_counts"] = retry_counts
        target.status = StepStatus.RUNNING
        target.error_message = f"Auto retry {attempts + 1}/{max_retries}: {reason[:500]}"
        target.started_at = None
        target.finished_at = None
        target.save(update_fields=["status", "error_message", "started_at", "finished_at", "updated_at"])

        completed_before = len([item for item in steps if item.step_order < target.step_order and item.status == StepStatus.COMPLETED])
        job.config = config
        job.status = JobStatus.RUNNING
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
        AutomationLogService.log(
            job,
            f"Auto retry {attempts + 1}/{max_retries} scheduled for step: {target.name}",
            level="warning",
        )
        return True

    @classmethod
    def _create_page_from_payload(cls, job: AutomationJob, payload: dict) -> Page:
        config = job.config or {}
        output_type = config.get("output_type", "blog")
        page_type = OUTPUT_TO_PAGE_TYPE.get(output_type, PageType.BLOG)
        domain = config.get("domain") or {}
        publish_at = _parse_scheduled_at(config.get("publish_at"))
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
        if publish_at:
            page.scheduled_at = publish_at
            page.save(update_fields=["scheduled_at", "updated_at"])

        visual_asset = config.get("visual_asset") if config.get("free_image_enabled", True) else None
        landing_theme = config.get("landing_theme") if config.get("landing_design_enabled", True) else None
        if visual_asset:
            BlockService.create_block(
                page,
                {
                    "block_type": "image",
                    "sort_order": 0,
                    "config": {
                        **visual_asset,
                        "caption": f"תמונה חינמית לשימוש מסחרי · {visual_asset.get('source', '')}",
                        "theme": landing_theme,
                    },
                },
            )

        for index, block in enumerate(payload.get("blocks") or [], start=1):
            block_config = block.get("config", {})
            if landing_theme and block.get("type") == "hero":
                block_config = {**block_config, "theme": landing_theme}
            BlockService.create_block(
                page,
                {
                    "block_type": block.get("type", "rich_text"),
                    "sort_order": index,
                    "config": block_config,
                },
            )
        cls._assign_generation_category(page, domain)
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
    def _assign_generation_category(page: Page, domain: dict) -> None:
        if not domain.get("label"):
            return
        taxonomy, _ = Taxonomy.objects.get_or_create(
            tenant_id=page.tenant_id,
            slug="ai-seo-categories",
            defaults={
                "name": "AI SEO Categories",
                "kind": "category",
                "is_hierarchical": True,
                "allow_multiple": False,
            },
        )
        term, _ = TaxonomyTerm.objects.get_or_create(
            tenant_id=page.tenant_id,
            taxonomy=taxonomy,
            slug=domain.get("value") or "general",
            defaults={
                "name": domain.get("label") or "כללי",
                "full_path": domain.get("value") or "general",
            },
        )
        TaxonomyService.assign_term(page, str(term.id))

    @staticmethod
    def _page_category(page: Page) -> dict | None:
        page_term = (
            page.page_terms.select_related("term", "term__taxonomy")
            .filter(deleted_at__isnull=True, term__taxonomy__kind="category")
            .order_by("created_at")
            .first()
        )
        if not page_term:
            return None
        return {
            "id": str(page_term.term_id),
            "name": page_term.term.name,
            "slug": page_term.term.slug,
        }

    @staticmethod
    def _page_image(page: Page) -> dict | None:
        image = page.blocks.filter(block_type="image", deleted_at__isnull=True, is_visible=True).order_by("sort_order").first()
        return image.config if image else None

    @staticmethod
    def _build_prompt(*, output_type: str, domain_label: str, keywords: list[str], locale: str, feedback: str, user_prompt: str) -> str:
        asset = "SEO landing page" if output_type == "landing_page" else "SEO blog article"
        return f"""
Create a production-ready {asset} in Hebrew for the business domain: {domain_label}.
Use only the following real user-selected keywords: {", ".join(keywords)}.
Additional user instructions: {user_prompt or "none"}.
Revision feedback: {feedback or "none"}.
For blog articles include a clear intro, practical sections, and a summary.
For landing pages use a distinct visual style, persuasive headline, and conversion-focused CTA.

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
        source_config = cls._source_config_for_page(page)
        selected_keywords = data.get("keywords") or source_config.get("keywords") or []
        domain = data.get("domain") or source_config.get("domain") or {"label": page.title, "value": "custom"}
        if isinstance(domain, str):
            domain = {"label": domain, "value": "custom"}
        config = {
            "domain": domain,
            "keywords": selected_keywords,
            "output_type": source_config.get("output_type") or ("landing_page" if page.page_type == PageType.LANDING_PAGE else "blog"),
            "feedback": data.get("feedback", ""),
            "locale": page.locale,
            "prompt": source_config.get("prompt", ""),
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
    def _source_config_for_page(page: Page) -> dict:
        source_job = AiSeoGenerationService._source_job_for_page(page)
        return source_job.config if source_job and isinstance(source_job.config, dict) else {}

    @staticmethod
    def _source_job_for_page(page: Page) -> AutomationJob | None:
        return (
            AutomationJob.objects.filter(
                tenant_id=page.tenant_id,
                job_type__in=[JobType.GENERATE_BLOG_ARTICLE, JobType.GENERATE_LANDING_PAGE],
                config__generated_page_id=str(page.id),
                deleted_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )

    @staticmethod
    def publish_page(tenant_id, user, page_id: str) -> Page:
        page = PageService.get_page(tenant_id, page_id)
        source_job = AiSeoGenerationService._source_job_for_page(page)
        if source_job:
            AiSeoGenerationService.publish_job(tenant_id, user, source_job.id)
            page.refresh_from_db()
            return page
        return PublishService.transition(
            tenant_id,
            page_id,
            user,
            PageStatus.PUBLISHED,
            change_summary="Approved from AI SEO Workspace",
        )

    @staticmethod
    def publish_job(tenant_id, user, job_id: str) -> AutomationJob:
        from automation.application.executor import JobExecutor

        job = JobService.get_job(tenant_id, job_id)
        publish_step = job.steps.filter(step_type="ai_seo.publish", deleted_at__isnull=True).order_by("step_order").first()
        if not publish_step:
            page_id = (job.config or {}).get("generated_page_id")
            if page_id:
                PublishService.transition(
                    tenant_id,
                    page_id,
                    user,
                    PageStatus.PUBLISHED,
                    change_summary="Approved from AI SEO Workspace",
                )
            return job

        config = job.config or {}
        config["manual_publish_requested"] = True
        job.config = config
        job.error_message = ""
        if job.status == JobStatus.WAITING_APPROVAL:
            job.status = JobStatus.RUNNING
        job.save(update_fields=["config", "status", "error_message", "updated_at"])
        publish_step.status = StepStatus.RUNNING
        publish_step.error_message = ""
        publish_step.started_at = None
        publish_step.finished_at = None
        publish_step.save(update_fields=["status", "error_message", "started_at", "finished_at", "updated_at"])
        AutomationLogService.log(job, "Manual production upload requested")
        JobExecutor.run_next_step(job)
        job.refresh_from_db()
        return job

    @staticmethod
    def delete_page(tenant_id, page_id: str) -> None:
        PageService.soft_delete(tenant_id, page_id)
