"""AI SEO Automation Center — real data only, never fabricated."""

from __future__ import annotations

from django.conf import settings
from django.db import connection
from django.db.models import Count
from django.utils import timezone

from audit.infrastructure.models import AuditLog
from automation.application.dashboard_service import DashboardService
from automation.domain.enums import JobStatus
from automation.infrastructure.models import AutomationJob
from content.domain.status import PageStatus, PageType
from content.infrastructure.models import Page
from integrations.application.google_config import oauth_configured
from integrations.application.google_oauth_service import GoogleOAuthService
from integrations.domain.enums import ConnectionStatus, GoogleServiceType, SyncStatus
from integrations.infrastructure.models import GoogleServiceConnection, IntegrationSyncRecord
from leads.domain.status import LeadStatus
from leads.infrastructure.models import Lead


def _pct_change(current: float | int, previous: float | int) -> float | None:
    if previous in (0, None) or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def _latest_sync(tenant_id, service_type: str):
    return (
        IntegrationSyncRecord.objects.filter(
            tenant_id=tenant_id,
            service_type=service_type,
            sync_status=SyncStatus.SUCCESS,
            deleted_at__isnull=True,
        )
        .order_by("-retrieved_at")
        .first()
    )


def _previous_sync(tenant_id, service_type: str, before):
    return (
        IntegrationSyncRecord.objects.filter(
            tenant_id=tenant_id,
            service_type=service_type,
            sync_status=SyncStatus.SUCCESS,
            deleted_at__isnull=True,
            retrieved_at__lt=before,
        )
        .order_by("-retrieved_at")
        .first()
    )


class AiSeoDashboardService:
    @classmethod
    def build(cls, tenant_id) -> dict:
        now = timezone.now()
        return {
            "generated_at": now.isoformat(),
            "services": cls.service_flags(tenant_id),
            "kpis": cls.kpis(tenant_id),
            "organic": cls.organic_performance(tenant_id),
            "hot_keywords": cls.hot_keywords(tenant_id),
            "automation_tasks": cls.automation_tasks(tenant_id),
            "lead_funnel": cls.lead_funnel(tenant_id),
            "content_review": cls.content_review(tenant_id),
            "system": cls.system_status(tenant_id),
            "recent_activity": cls.recent_activity(tenant_id),
            "reminders": cls.reminders(tenant_id),
        }

    @classmethod
    def service_flags(cls, tenant_id) -> list[dict]:
        flags = []
        for st in (GoogleServiceType.SEARCH_CONSOLE, GoogleServiceType.ANALYTICS, GoogleServiceType.TRENDS):
            conn = GoogleOAuthService.get_or_create_connection(tenant_id, st)
            status = GoogleOAuthService.effective_status(conn)
            needs_oauth = st != GoogleServiceType.TRENDS
            configured = oauth_configured() if needs_oauth else True
            flags.append(
                {
                    "id": st,
                    "status": status,
                    "configured": configured,
                    "connected": status == ConnectionStatus.CONNECTED,
                    "last_sync_at": conn.last_sync_at.isoformat() if conn.last_sync_at else None,
                    "last_error": conn.last_error or None,
                    "property_label": conn.property_label or None,
                    "requires_action": (
                        (needs_oauth and not configured)
                        or status in {ConnectionStatus.NOT_CONNECTED, ConnectionStatus.CONFIG_REQUIRED, ConnectionStatus.ERROR}
                        or (status == ConnectionStatus.WAITING_AUTHORIZATION)
                    ),
                }
            )

        ai_configured = bool(getattr(settings, "GEMINI_API_KEY", ""))
        flags.append(
            {
                "id": "ai_provider",
                "status": "connected" if ai_configured else "not_configured",
                "configured": ai_configured,
                "connected": ai_configured,
                "last_sync_at": None,
                "last_error": None,
                "property_label": "Gemini" if ai_configured else None,
                "requires_action": not ai_configured,
            }
        )
        return flags

    @classmethod
    def kpis(cls, tenant_id) -> dict:
        month_ago = timezone.now() - timezone.timedelta(days=30)
        leads_new = Lead.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True, created_at__gte=month_ago).count()
        leads_total = Lead.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).count()

        gsc = _latest_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        gsc_prev = _previous_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE, gsc.retrieved_at) if gsc else None
        summary = (gsc.processed_data or {}).get("summary", {}) if gsc else {}
        prev_summary = (gsc_prev.processed_data or {}).get("summary", {}) if gsc_prev else {}

        clicks = summary.get("clicks")
        impressions = summary.get("impressions")
        page_one = None
        if gsc and gsc.processed_data:
            queries = gsc.processed_data.get("queries") or []
            page_one = sum(1 for q in queries if q.get("position", 99) <= 10)

        return {
            "lead_revenue": {"available": False, "value": None, "change_pct": None},
            "new_leads": {
                "available": True,
                "value": leads_new,
                "total": leads_total,
                "change_pct": None,
                "period_days": 30,
            },
            "organic_clicks": {
                "available": clicks is not None and gsc is not None,
                "value": clicks,
                "change_pct": _pct_change(clicks or 0, prev_summary.get("clicks", 0)) if gsc_prev else None,
            },
            "impressions": {
                "available": impressions is not None and gsc is not None,
                "value": impressions,
                "change_pct": _pct_change(impressions or 0, prev_summary.get("impressions", 0)) if gsc_prev else None,
            },
            "page_one_rankings": {
                "available": page_one is not None and gsc is not None,
                "value": page_one,
                "change_pct": None,
            },
        }

    @classmethod
    def organic_performance(cls, tenant_id) -> dict:
        gsc = _latest_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        if not gsc:
            conn = GoogleOAuthService.get_or_create_connection(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
            return {
                "available": False,
                "reason": "no_sync",
                "connection_status": GoogleOAuthService.effective_status(conn),
                "series": [],
                "summary": {},
            }

        history = (
            IntegrationSyncRecord.objects.filter(
                tenant_id=tenant_id,
                service_type=GoogleServiceType.SEARCH_CONSOLE,
                sync_status=SyncStatus.SUCCESS,
                deleted_at__isnull=True,
            )
            .order_by("retrieved_at")
            .values("retrieved_at", "processed_data")[:30]
        )
        series = []
        for row in history:
            s = (row["processed_data"] or {}).get("summary", {})
            if s.get("clicks") is not None or s.get("impressions") is not None:
                series.append(
                    {
                        "date": row["retrieved_at"].date().isoformat(),
                        "clicks": s.get("clicks", 0),
                        "impressions": s.get("impressions", 0),
                    }
                )

        summary = (gsc.processed_data or {}).get("summary", {})
        return {
            "available": True,
            "last_sync_at": gsc.retrieved_at.isoformat(),
            "series": series,
            "summary": {
                "clicks": summary.get("clicks"),
                "impressions": summary.get("impressions"),
                "ctr": summary.get("ctr"),
                "position": summary.get("position"),
            },
        }

    @classmethod
    def hot_keywords(cls, tenant_id) -> dict:
        items = []
        trends = _latest_sync(tenant_id, GoogleServiceType.TRENDS)
        if trends:
            processed = trends.processed_data or {}
            for kw in (processed.get("keywords") or [])[:5]:
                items.append({"keyword": kw, "source": "google_trends", "volume": None, "trend": None})
            for row in (processed.get("trending_searches") or [])[:10]:
                term = row[0] if isinstance(row, (list, tuple)) and row else str(row)
                if term and not any(i["keyword"] == term for i in items):
                    items.append({"keyword": term, "source": "google_trends", "volume": None, "trend": "up"})

        gsc = _latest_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        if gsc:
            queries = sorted(
                (gsc.processed_data or {}).get("queries") or [],
                key=lambda q: q.get("impressions", 0),
                reverse=True,
            )[:10]
            for q in queries:
                kw = q.get("query", "")
                if kw and not any(i["keyword"] == kw for i in items):
                    items.append(
                        {
                            "keyword": kw,
                            "source": "search_console",
                            "volume": q.get("impressions"),
                            "trend": None,
                            "clicks": q.get("clicks"),
                            "position": q.get("position"),
                        }
                    )

        return {
            "available": len(items) > 0,
            "last_sync_at": trends.retrieved_at.isoformat() if trends else (gsc.retrieved_at.isoformat() if gsc else None),
            "items": items[:15],
        }

    @classmethod
    def automation_tasks(cls, tenant_id, *, limit=8) -> list[dict]:
        qs = AutomationJob.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by("-updated_at")[:limit]
        return [
            {
                "id": str(job.id),
                "name": job.name,
                "job_type": job.job_type,
                "status": job.status,
                "progress_percent": job.progress_percent,
                "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            }
            for job in qs
        ]

    @classmethod
    def lead_funnel(cls, tenant_id) -> dict:
        gsc = _latest_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        summary = (gsc.processed_data or {}).get("summary", {}) if gsc else {}
        impressions = summary.get("impressions")
        clicks = summary.get("clicks")

        status_counts = {
            row["status"]: row["count"]
            for row in Lead.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
            .values("status")
            .annotate(count=Count("id"))
        }
        leads_total = sum(status_counts.values())
        converted = status_counts.get(LeadStatus.CONVERTED, 0)
        qualified = status_counts.get(LeadStatus.QUALIFIED, 0)

        stages = []
        if impressions is not None:
            stages.append({"label": "impressions", "value": impressions})
        if clicks is not None:
            stages.append({"label": "clicks", "value": clicks})
        stages.append({"label": "leads", "value": leads_total})
        stages.append({"label": "qualified", "value": qualified})
        stages.append({"label": "converted", "value": converted})

        return {
            "available": leads_total > 0 or (impressions is not None),
            "gsc_connected": gsc is not None,
            "stages": stages,
        }

    @classmethod
    def content_review(cls, tenant_id, *, limit=10) -> dict:
        qs = Page.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
            status__in=[PageStatus.IN_REVIEW, PageStatus.DRAFT],
        ).order_by("-updated_at")[:limit]
        items = [
            {
                "id": str(p.id),
                "title": p.title,
                "page_type": p.page_type,
                "status": p.status,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "full_path": p.full_path,
            }
            for p in qs
        ]
        waiting = Page.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
            status=PageStatus.IN_REVIEW,
        ).count()
        return {"available": True, "waiting_count": waiting, "items": items}

    @classmethod
    def system_status(cls, tenant_id) -> dict:
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False
        auto = DashboardService.stats_for_tenant(tenant_id)
        return {
            "database": "healthy" if db_ok else "unhealthy",
            "workers_total": auto["workers_total"],
            "workers_busy": auto["workers_busy"],
            "queue_size": auto["queue_size"],
            "running_jobs": auto["running_jobs"],
            "waiting_approval": auto["waiting_approval"],
        }

    @classmethod
    def recent_activity(cls, tenant_id, *, limit=8) -> list[dict]:
        rows = AuditLog.objects.filter(tenant_id=tenant_id).order_by("-created_at")[:limit]
        return [
            {
                "id": str(r.id),
                "action": r.action,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user_email": r.user.email if r.user_id else None,
            }
            for r in rows
        ]

    @classmethod
    def reminders(cls, tenant_id) -> list[dict]:
        reminders = []
        waiting = Page.objects.filter(
            tenant_id=tenant_id, deleted_at__isnull=True, status=PageStatus.IN_REVIEW
        ).count()
        if waiting:
            reminders.append({"type": "content_review", "count": waiting})

        queue = AutomationJob.objects.filter(
            tenant_id=tenant_id,
            deleted_at__isnull=True,
            status__in=[JobStatus.QUEUED, JobStatus.SCHEDULED, JobStatus.RETRYING],
        ).count()
        if queue:
            reminders.append({"type": "automation_queue", "count": queue})

        for st in (GoogleServiceType.SEARCH_CONSOLE, GoogleServiceType.ANALYTICS):
            conn = GoogleOAuthService.get_or_create_connection(tenant_id, st)
            if GoogleOAuthService.effective_status(conn) != ConnectionStatus.CONNECTED:
                reminders.append({"type": f"connect_{st}", "count": 1})
        return reminders

    @classmethod
    def keywords_studio(cls, tenant_id) -> dict:
        gsc = _latest_sync(tenant_id, GoogleServiceType.SEARCH_CONSOLE)
        trends = _latest_sync(tenant_id, GoogleServiceType.TRENDS)
        rows = []
        if gsc:
            for q in (gsc.processed_data or {}).get("queries") or []:
                rows.append(
                    {
                        "keyword": q.get("query", ""),
                        "source": "search_console",
                        "clicks": q.get("clicks"),
                        "impressions": q.get("impressions"),
                        "ctr": q.get("ctr"),
                        "position": q.get("position"),
                        "volume": q.get("impressions"),
                        "trend": None,
                    }
                )
        if trends:
            processed = trends.processed_data or {}
            for kw in processed.get("keywords") or []:
                rows.append({"keyword": kw, "source": "google_trends", "volume": None, "trend": None})
        return {
            "available": len(rows) > 0,
            "last_sync_at": gsc.retrieved_at.isoformat() if gsc else (trends.retrieved_at.isoformat() if trends else None),
            "results": rows,
            "services": cls.service_flags(tenant_id),
        }
