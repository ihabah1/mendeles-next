from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.infrastructure.models import AuditLog
from core.permissions.base import HasPermission
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
                },
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
                "landing_preview": {
                    "demo": True,
                    "pages_total": 3,
                    "pages_published": 2,
                    "total_views": 1284,
                    "views_today": 86,
                    "leads_total": 47,
                    "conversion_rate": 3.2,
                    "top_pages": [
                        {"name": "דף נחיתה — שירותי עיצוב", "slug": "design-services", "views": 512},
                        {"name": "הרשמה לוובינר", "slug": "webinar-signup", "views": 398},
                        {"name": "מבצע קיץ", "slug": "summer-promo", "views": 374},
                    ],
                    "views_by_day": [
                        {"date": (now - timezone.timedelta(days=i)).strftime("%Y-%m-%d"), "views": v}
                        for i, v in zip(range(6, -1, -1), [98, 112, 134, 156, 142, 178, 186])
                    ],
                },
            }
        )
