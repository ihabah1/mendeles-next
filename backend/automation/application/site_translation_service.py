"""Pauseable site-page translation jobs — one step per page × target locale."""

from __future__ import annotations

import copy
import json
from typing import Any

from django.db import transaction
from django.utils import timezone

from automation.application.log_service import AutomationLogService
from automation.domain.enums import JobPriority, JobStatus, JobType, StepStatus
from automation.infrastructure.models import AutomationJob, AutomationJobStep
from content.application.block_service import BlockService
from content.domain.status import PageStatus
from content.infrastructure.models import ContentBlock, Page
from core.exceptions.base import ValidationError

TARGET_LOCALES = ("he", "en", "es", "ar", "de", "zh")

LOCALE_NAMES = {
    "he": "Hebrew",
    "en": "English",
    "es": "Spanish",
    "ar": "Arabic",
    "de": "German",
    "zh": "Chinese (Simplified)",
}


class SiteTranslationService:
    STEP_TYPE = "translate_site_page"
    OPEN_STATUSES = (
        JobStatus.QUEUED,
        JobStatus.RUNNING,
        JobStatus.PAUSED,
        JobStatus.RETRYING,
    )

    @classmethod
    def find_open_job(cls, tenant_id) -> AutomationJob | None:
        return (
            AutomationJob.objects.filter(
                tenant_id=tenant_id,
                job_type=JobType.TRANSLATE_SITE_PAGES,
                status__in=cls.OPEN_STATUSES,
                deleted_at__isnull=True,
            )
            .order_by("-updated_at")
            .first()
        )

    @classmethod
    def continue_open_job(cls, tenant_id, user, *, request=None) -> tuple[AutomationJob | None, bool]:
        """
        Resume/return the open translation job so work is not repeated.
        Returns (job, continued) — continued=True when an existing job was reused.
        """
        from automation.application.job_service import JobService

        job = cls.find_open_job(tenant_id)
        if not job:
            return None, False
        if job.status == JobStatus.PAUSED:
            job = JobService.resume_job(tenant_id, user, job.id, request=request)
        return job, True

    @classmethod
    def create_job(
        cls,
        tenant_id,
        user,
        *,
        target_locales: list[str] | None = None,
        page_ids: list[str] | None = None,
        skip_existing: bool = True,
        overwrite: bool = False,
        name: str = "",
        force_new: bool = False,
        request=None,
    ) -> tuple[AutomationJob, bool]:
        """Create a translation job, or continue an open one. Returns (job, continued)."""
        from automation.application.job_service import JobService

        if not force_new:
            existing, continued = cls.continue_open_job(tenant_id, user, request=request)
            if existing:
                AutomationLogService.log(
                    existing,
                    "Continued existing translation job (skipped creating a duplicate)",
                )
                return existing, True

        locales = [loc for loc in (target_locales or list(TARGET_LOCALES)) if loc in TARGET_LOCALES]
        if not locales:
            raise ValidationError("Select at least one target locale.")

        sources = cls._source_pages(tenant_id, page_ids)
        if not sources:
            raise ValidationError("No source pages found to translate.")

        # Pairs already completed on an open/recent incomplete job — never re-queue those.
        already_done = cls._completed_unit_keys(tenant_id) if skip_existing and not overwrite else set()

        steps: list[dict] = []
        for source in sources:
            for locale in locales:
                if locale == source.locale:
                    continue
                unit_key = f"{source.full_path}::{locale}"
                if unit_key in already_done:
                    continue
                existing = Page.objects.filter(
                    tenant_id=tenant_id,
                    full_path=source.full_path,
                    locale=locale,
                    deleted_at__isnull=True,
                ).first()
                if existing and skip_existing and not overwrite:
                    continue
                steps.append(
                    {
                        "name": f"{source.title[:60]} → {LOCALE_NAMES.get(locale, locale)}",
                        "step_type": cls.STEP_TYPE,
                        "config": {
                            "source_page_id": str(source.id),
                            "source_locale": source.locale,
                            "target_locale": locale,
                            "full_path": source.full_path,
                            "overwrite": overwrite,
                        },
                    }
                )

        if not steps:
            raise ValidationError(
                "Nothing to translate — target locale pages already exist (turn off skip existing to overwrite)."
            )

        if force_new:
            open_job = cls.find_open_job(tenant_id)
            if open_job:
                JobService.cancel_job(tenant_id, user, open_job.id, request=request)

        job = JobService.create_job(
            tenant_id,
            user,
            {
                "name": name
                or f"Translate site pages ({len(steps)} units · {', '.join(locales)})",
                "job_type": JobType.TRANSLATE_SITE_PAGES.value,
                "priority": JobPriority.NORMAL.value,
                "requires_approval": False,
                "config": {
                    "target_locales": locales,
                    "skip_existing": skip_existing,
                    "overwrite": overwrite,
                    "total_units": len(steps),
                    "completed_units": 0,
                    "failed_units": 0,
                    "results": [],
                },
                "steps": steps,
            },
            request=request,
        )
        AutomationLogService.log(job, f"Queued {len(steps)} translation unit(s)")
        return job, False

    @classmethod
    def _completed_unit_keys(cls, tenant_id) -> set[str]:
        """full_path::locale pairs already completed on any non-cancelled translation job."""
        keys: set[str] = set()
        steps = AutomationJobStep.objects.filter(
            job__tenant_id=tenant_id,
            job__job_type=JobType.TRANSLATE_SITE_PAGES,
            job__deleted_at__isnull=True,
            deleted_at__isnull=True,
            status=StepStatus.COMPLETED,
            step_type=cls.STEP_TYPE,
        )
        for step in steps.iterator():
            cfg = step.config or {}
            path = cfg.get("full_path")
            locale = cfg.get("target_locale")
            if path and locale:
                keys.add(f"{path}::{locale}")
        return keys

    @classmethod
    def _source_pages(cls, tenant_id, page_ids: list[str] | None) -> list[Page]:
        qs = Page.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("full_path", "locale")
        if page_ids:
            qs = qs.filter(id__in=page_ids)

        # Prefer one canonical source per path (he > en > other).
        by_path: dict[str, Page] = {}
        priority = {"he": 0, "en": 1, "ar": 2}
        for page in qs:
            current = by_path.get(page.full_path)
            if not current:
                by_path[page.full_path] = page
                continue
            if priority.get(page.locale, 9) < priority.get(current.locale, 9):
                by_path[page.full_path] = page
        return list(by_path.values())

    @classmethod
    def execute_step(cls, job: AutomationJob, step: AutomationJobStep, execution=None) -> dict[str, Any]:
        cfg = step.config or {}
        source_id = cfg.get("source_page_id")
        target_locale = cfg.get("target_locale")
        overwrite = bool(cfg.get("overwrite"))
        if not source_id or not target_locale:
            raise RuntimeError("Translation step is missing source_page_id or target_locale.")

        source = Page.objects.filter(id=source_id, tenant_id=job.tenant_id, deleted_at__isnull=True).first()
        if not source:
            raise RuntimeError(f"Source page {source_id} not found.")

        result = cls._translate_and_save(source, target_locale=target_locale, overwrite=overwrite, job=job, execution=execution)
        config = dict(job.config or {})
        results = list(config.get("results") or [])
        results.append(result)
        config["results"] = results[-500:]
        config["completed_units"] = int(config.get("completed_units") or 0) + (1 if result.get("ok") else 0)
        if not result.get("ok"):
            config["failed_units"] = int(config.get("failed_units") or 0) + 1
        job.config = config
        job.save(update_fields=["config", "updated_at"])
        return result

    @classmethod
    def _translate_and_save(
        cls,
        source: Page,
        *,
        target_locale: str,
        overwrite: bool,
        job: AutomationJob,
        execution=None,
    ) -> dict[str, Any]:
        blocks = list(BlockService.list_blocks(source))
        payload = {
            "title": source.title,
            "meta_title": source.meta_title,
            "meta_description": source.meta_description,
            "blocks": [
                {
                    "block_type": b.block_type,
                    "sort_order": b.sort_order,
                    "config": b.config or {},
                    "is_visible": b.is_visible,
                }
                for b in blocks
            ],
        }
        translated = cls._translate_payload(payload, source_locale=source.locale, target_locale=target_locale)

        existing = Page.objects.filter(
            tenant_id=source.tenant_id,
            full_path=source.full_path,
            locale=target_locale,
            deleted_at__isnull=True,
        ).first()

        with transaction.atomic():
            if existing:
                if not overwrite:
                    AutomationLogService.log(
                        job,
                        f"Skipped existing {source.full_path} ({target_locale})",
                        execution=execution,
                    )
                    return {
                        "ok": True,
                        "skipped": True,
                        "source_page_id": str(source.id),
                        "target_page_id": str(existing.id),
                        "full_path": source.full_path,
                        "target_locale": target_locale,
                    }
                page = existing
                page.title = translated.get("title") or page.title
                page.meta_title = translated.get("meta_title") or ""
                page.meta_description = translated.get("meta_description") or ""
                page.updated_at = timezone.now()
                page.save(update_fields=["title", "meta_title", "meta_description", "updated_at"])
                ContentBlock.objects.filter(page=page, deleted_at__isnull=True).update(deleted_at=timezone.now())
            else:
                page = Page.objects.create(
                    tenant_id=source.tenant_id,
                    parent=source.parent,
                    template=source.template,
                    page_type=source.page_type,
                    status=PageStatus.DRAFT,
                    locale=target_locale,
                    title=translated.get("title") or source.title,
                    slug=source.slug,
                    full_path=source.full_path,
                    sort_order=source.sort_order,
                    meta_title=translated.get("meta_title") or "",
                    meta_description=translated.get("meta_description") or "",
                    created_by=source.created_by,
                    author=source.author,
                )

            for block in translated.get("blocks") or []:
                BlockService.create_block(
                    page,
                    {
                        "block_type": block.get("block_type") or "text",
                        "sort_order": block.get("sort_order") or 0,
                        "config": block.get("config") or {},
                        "is_visible": block.get("is_visible", True),
                    },
                )

        AutomationLogService.log(
            job,
            f"Translated {source.full_path}: {source.locale} → {target_locale}",
            execution=execution,
        )
        return {
            "ok": True,
            "skipped": False,
            "source_page_id": str(source.id),
            "target_page_id": str(page.id),
            "full_path": source.full_path,
            "target_locale": target_locale,
            "title": page.title,
        }

    @classmethod
    def _translate_payload(cls, payload: dict, *, source_locale: str, target_locale: str) -> dict:
        from ai_seo.application.gemini_service import GeminiError, GeminiService

        lang = LOCALE_NAMES.get(target_locale, target_locale)
        src = LOCALE_NAMES.get(source_locale, source_locale)
        prompt = (
            f"Translate the following website page JSON from {src} to {lang}.\n"
            "Rules:\n"
            "- Return ONLY valid JSON with keys title, meta_title, meta_description, blocks.\n"
            "- Keep block_type, sort_order, is_visible unchanged.\n"
            "- Translate human-readable text inside each block config.\n"
            "- Do NOT translate URLs, emails, IDs, CSS classes, or brand name Mendeles.\n"
            "- Keep the same number of blocks and nested structure.\n\n"
            f"INPUT:\n{json.dumps(payload, ensure_ascii=False)}"
        )
        if GeminiService.configured():
            try:
                result = GeminiService.generate_json(prompt)
                if isinstance(result, dict) and result.get("title"):
                    if "blocks" not in result:
                        result["blocks"] = payload.get("blocks") or []
                    return result
            except GeminiError:
                pass
        return cls._fallback_payload(payload, target_locale=target_locale)

    @staticmethod
    def _fallback_payload(payload: dict, *, target_locale: str) -> dict:
        out = copy.deepcopy(payload)
        marker = f"[{target_locale}]"
        title = out.get("title") or "Page"
        if not title.startswith(marker):
            out["title"] = f"{marker} {title}"
        meta = out.get("meta_title") or title
        if not str(meta).startswith(marker):
            out["meta_title"] = f"{marker} {meta}"
        return out

    @classmethod
    def preview_units(cls, tenant_id, *, target_locales: list[str] | None = None, skip_existing: bool = True) -> dict:
        locales = [loc for loc in (target_locales or list(TARGET_LOCALES)) if loc in TARGET_LOCALES]
        sources = cls._source_pages(tenant_id, None)
        planned = 0
        skipped = 0
        for source in sources:
            for locale in locales:
                if locale == source.locale:
                    continue
                exists = Page.objects.filter(
                    tenant_id=tenant_id,
                    full_path=source.full_path,
                    locale=locale,
                    deleted_at__isnull=True,
                ).exists()
                if exists and skip_existing:
                    skipped += 1
                else:
                    planned += 1
        return {
            "source_pages": len(sources),
            "target_locales": locales,
            "planned_units": planned,
            "skipped_existing": skipped,
            "locale_labels": {code: LOCALE_NAMES[code] for code in locales},
        }
