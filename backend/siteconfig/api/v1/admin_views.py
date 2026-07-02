from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.infrastructure.models import AuditLog
from content.domain.status import PageStatus, PageType
from content.infrastructure.models import Page
from core.permissions.base import HasPermission
from leads.infrastructure.models import Lead
from rbac.infrastructure.models import Permission, Role, UserRole
from tenancy.infrastructure.models import Tenant

User = get_user_model()


class AdminOverviewView(APIView):
    permission_classes = [HasPermission]
    required_permission = "tenants.view"

    def get(self, request):
        now = timezone.now()
        day_ago = now - timezone.timedelta(hours=24)
        week_ago = now - timezone.timedelta(days=7)

        users_qs = User.objects.filter(deleted_at__isnull=True)
        tenants_qs = Tenant.objects.filter(deleted_at__isnull=True)

        users_by_role = (
            UserRole.objects.filter(user__deleted_at__isnull=True)
            .values("role__slug", "role__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        recent_audit = list(
            AuditLog.objects.select_related("user")
            .order_by("-created_at")[:8]
            .values("id", "action", "created_at", "user__email", "resource_type")
        )

        recent_logins = list(
            AuditLog.objects.filter(action="auth.login")
            .select_related("user")
            .order_by("-created_at")[:8]
            .values("id", "created_at", "user__email", "ip_address")
        )

        landing_pages_qs = Page.objects.filter(
            deleted_at__isnull=True,
            page_type=PageType.LANDING_PAGE,
        )
        recent_landing_pages = list(
            landing_pages_qs.select_related("tenant")
            .order_by("-updated_at")[:6]
            .values("id", "title", "status", "full_path", "tenant__name", "published_at", "updated_at")
        )

        leads_qs = Lead.objects.filter(deleted_at__isnull=True)

        return Response(
            {
                "generated_at": now.isoformat(),
                "system": {
                    "status": "healthy",
                    "users_total": users_qs.count(),
                    "users_active": users_qs.filter(is_active=True).count(),
                    "users_verified": users_qs.filter(email_verified_at__isnull=False).count(),
                    "tenants_total": tenants_qs.count(),
                    "tenants_active": tenants_qs.filter(status=Tenant.Status.ACTIVE).count(),
                    "roles_total": Role.objects.filter(deleted_at__isnull=True).count(),
                    "permissions_total": Permission.objects.count(),
                    "audit_last_24h": AuditLog.objects.filter(created_at__gte=day_ago).count(),
                    "logins_last_7d": AuditLog.objects.filter(
                        action="auth.login", created_at__gte=week_ago
                    ).count(),
                    "landing_pages_total": landing_pages_qs.count(),
                    "landing_pages_published": landing_pages_qs.filter(
                        status=PageStatus.PUBLISHED
                    ).count(),
                    "landing_pages_draft": landing_pages_qs.filter(status=PageStatus.DRAFT).count(),
                    "leads_total": leads_qs.count(),
                },
                "automation": {
                    "status": "not_implemented",
                    "phase": "X",
                    "active_jobs": 0,
                    "scheduled_jobs": 0,
                    "running_jobs": 0,
                    "completed_jobs": 0,
                    "failed_jobs": 0,
                    "queue_size": 0,
                    "upcoming_jobs": 0,
                    "credits_used": 0,
                    "estimated_completion_minutes": None,
                },
                "recent_jobs": [],
                "users_by_role": [
                    {"role": row["role__slug"], "name": row["role__name"], "count": row["count"]}
                    for row in users_by_role
                ],
                "recent_audit": [
                    {
                        "id": str(row["id"]),
                        "action": row["action"],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                        "user_email": row["user__email"],
                        "resource_type": row["resource_type"],
                    }
                    for row in recent_audit
                ],
                "recent_logins": [
                    {
                        "id": str(row["id"]),
                        "user_email": row["user__email"],
                        "ip_address": row["ip_address"],
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    }
                    for row in recent_logins
                ],
                "recent_landing_pages": [
                    {
                        "id": str(row["id"]),
                        "title": row["title"],
                        "status": row["status"],
                        "full_path": row["full_path"],
                        "tenant_name": row["tenant__name"],
                        "published_at": row["published_at"].isoformat() if row["published_at"] else None,
                        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                    }
                    for row in recent_landing_pages
                ],
            }
        )
