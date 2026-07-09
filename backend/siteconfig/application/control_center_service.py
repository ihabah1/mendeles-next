from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone

from audit.infrastructure.models import AuditLog, SiteErrorLog
from automation.domain.enums import JobStatus
from automation.infrastructure.models import AutomationJob
from client_portal.application.portal_service import CLIENT_REQUEST_SOURCE, ClientPortalService
from rbac.infrastructure.models import Role, UserRole
from siteconfig.application.settings_service import (
    FEATURE_FLAG_DEFINITIONS,
    SettingsService,
    _setting_bool,
)

User = get_user_model()


class ControlCenterService:
    @staticmethod
    def get_feature_flags(tenant_id) -> list[dict]:
        settings = SettingsService.get_tenant_settings(tenant_id)
        return [
            {
                "key": item["key"],
                "slug": item["slug"],
                "enabled": _setting_bool(settings.get(item["key"]), default=item.get("default", True)),
            }
            for item in FEATURE_FLAG_DEFINITIONS
        ]

    @staticmethod
    def get_recent_changes(*, is_platform: bool, tenant_id, limit: int = 20) -> list[dict]:
        qs = AuditLog.objects.select_related("user").order_by("-created_at")
        if not is_platform:
            qs = qs.filter(tenant_id=tenant_id)
        return [
            {
                "id": str(row.id),
                "action": row.action,
                "resource_type": row.resource_type,
                "resource_id": str(row.resource_id) if row.resource_id else None,
                "user_email": row.user.email if row.user_id else None,
                "metadata": row.metadata,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in qs[:limit]
        ]

    @staticmethod
    def get_error_logs(*, is_platform: bool, tenant_id, limit: int = 30) -> list[dict]:
        qs = SiteErrorLog.objects.order_by("-created_at")
        if not is_platform:
            qs = qs.filter(tenant_id=tenant_id)
        logs = [
            {
                "id": str(row.id),
                "level": row.level,
                "source": row.source,
                "message": row.message,
                "url": row.url,
                "user_email": row.user_email,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in qs[:limit]
        ]

        if len(logs) < limit:
            jobs_qs = AutomationJob.objects.filter(status="failed").order_by("-updated_at")
            if not is_platform:
                jobs_qs = jobs_qs.filter(tenant_id=tenant_id)
            for job in jobs_qs[: max(0, limit - len(logs))]:
                logs.append(
                    {
                        "id": f"job-{job.id}",
                        "level": "error",
                        "source": "automation",
                        "message": job.error_message or job.name or "Automation job failed",
                        "url": "",
                        "user_email": None,
                        "created_at": job.updated_at.isoformat() if job.updated_at else None,
                    }
                )
        return logs

    @staticmethod
    def get_client_permissions(*, is_platform: bool, tenant_id, limit: int = 50) -> list[dict]:
        users_qs = User.objects.filter(deleted_at__isnull=True).order_by("-created_at")
        if not is_platform:
            users_qs = users_qs.filter(default_tenant_id=tenant_id)
        results = []
        for user in users_qs[:limit]:
            roles = list(
                UserRole.objects.filter(user=user)
                .select_related("role")
                .values_list("role__slug", "role__name")
            )
            results.append(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                    "is_active": user.is_active,
                    "roles": [{"slug": slug, "name": name} for slug, name in roles],
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                }
            )
        return results

    @staticmethod
    def get_role_summary(*, is_platform: bool, tenant_id) -> list[dict]:
        qs = UserRole.objects.filter(user__deleted_at__isnull=True)
        if not is_platform:
            qs = qs.filter(tenant_id=tenant_id)
        rows = (
            qs.values("role__slug", "role__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        return [
            {"slug": row["role__slug"], "name": row["role__name"], "count": row["count"]}
            for row in rows
        ]

    @staticmethod
    def get_payload(*, user, is_platform: bool) -> dict:
        tenant_id = user.default_tenant_id
        now = timezone.now()
        week_ago = now - timezone.timedelta(days=7)

        users_qs = User.objects.filter(deleted_at__isnull=True)
        if not is_platform:
            users_qs = users_qs.filter(default_tenant_id=tenant_id)

        daily_activity = []
        for offset in range(6, -1, -1):
            day_start = (now - timezone.timedelta(days=offset)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timezone.timedelta(days=1)
            audit_qs = AuditLog.objects.filter(created_at__gte=day_start, created_at__lt=day_end)
            login_qs = audit_qs.filter(action="auth.login")
            if not is_platform:
                audit_qs = audit_qs.filter(tenant_id=tenant_id)
                login_qs = login_qs.filter(tenant_id=tenant_id)
            daily_activity.append(
                {
                    "date": day_start.date().isoformat(),
                    "logins": login_qs.count(),
                    "events": audit_qs.count(),
                }
            )

        errors_24h_qs = SiteErrorLog.objects.filter(created_at__gte=now - timezone.timedelta(hours=24))
        if not is_platform:
            errors_24h_qs = errors_24h_qs.filter(tenant_id=tenant_id)

        pending_statuses = [
            JobStatus.QUEUED,
            JobStatus.SCHEDULED,
            JobStatus.RUNNING,
            JobStatus.WAITING_APPROVAL,
            JobStatus.RETRYING,
        ]
        pending_qs = AutomationJob.objects.filter(
            deleted_at__isnull=True,
            config__request_source=CLIENT_REQUEST_SOURCE,
            status__in=pending_statuses,
        )
        if not is_platform:
            pending_qs = pending_qs.filter(tenant_id=tenant_id)

        return {
            "generated_at": now.isoformat(),
            "scope": "platform" if is_platform else "tenant",
            "stats": {
                "users_total": users_qs.count(),
                "users_active": users_qs.filter(is_active=True).count(),
                "logins_7d": AuditLog.objects.filter(
                    action="auth.login",
                    created_at__gte=week_ago,
                    **({"tenant_id": tenant_id} if not is_platform else {}),
                ).count(),
                "changes_24h": AuditLog.objects.filter(
                    created_at__gte=now - timezone.timedelta(hours=24),
                    **({"tenant_id": tenant_id} if not is_platform else {}),
                ).count(),
                "errors_24h": errors_24h_qs.count(),
                "roles_total": Role.objects.filter(deleted_at__isnull=True).count(),
                "feature_flags_active": sum(
                    1 for f in ControlCenterService.get_feature_flags(tenant_id) if f["enabled"]
                ),
                "pending_client_requests": pending_qs.count(),
            },
            "daily_activity": daily_activity,
            "feature_flags": ControlCenterService.get_feature_flags(tenant_id),
            "recent_changes": ControlCenterService.get_recent_changes(
                is_platform=is_platform, tenant_id=tenant_id
            ),
            "error_logs": ControlCenterService.get_error_logs(is_platform=is_platform, tenant_id=tenant_id),
            "client_permissions": ControlCenterService.get_client_permissions(
                is_platform=is_platform, tenant_id=tenant_id
            ),
            "client_requests": ClientPortalService.list_requests(
                tenant_id=tenant_id,
                user=user,
                platform_wide=is_platform,
                limit=8,
            ),
            "role_summary": ControlCenterService.get_role_summary(
                is_platform=is_platform, tenant_id=tenant_id
            ),
        }
