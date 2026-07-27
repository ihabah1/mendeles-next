"""Aggregated user hub stats — logins, daily breakdown, per-email counts."""

from django.contrib.auth import get_user_model
from django.db.models import Count, Max
from django.utils import timezone

from audit.infrastructure.models import AuditLog

User = get_user_model()

PASSWORD_LOGIN_ACTION = "auth.login"
GOOGLE_LOGIN_ACTION = "auth.login_google"


def _login_qs(*, tenant_id=None, platform_wide: bool = False, actions: tuple[str, ...] | list[str] | None = None):
    action_list = list(actions) if actions else [PASSWORD_LOGIN_ACTION]
    qs = AuditLog.objects.filter(action__in=action_list)
    if not platform_wide and tenant_id:
        qs = qs.filter(user__default_tenant_id=tenant_id)
    return qs


def _daily_counts(qs, *, days: int = 7) -> list[dict]:
    now = timezone.now()
    rows = []
    for offset in range(days - 1, -1, -1):
        day_start = (now - timezone.timedelta(days=offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timezone.timedelta(days=1)
        rows.append(
            {
                "date": day_start.date().isoformat(),
                "count": qs.filter(created_at__gte=day_start, created_at__lt=day_end).count(),
            }
        )
    return rows


def _serialize_recent(qs, *, limit: int = 30) -> list[dict]:
    rows = list(
        qs.select_related("user")
        .order_by("-created_at")[:limit]
        .values("id", "created_at", "user__email", "ip_address", "action")
    )
    return [
        {
            "id": str(row["id"]),
            "user_email": row["user__email"],
            "ip_address": row["ip_address"],
            "action": row.get("action") or "",
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }
        for row in rows
    ]


class UserHubService:
    @staticmethod
    def get_hub(*, tenant_id=None, platform_wide: bool = False, days: int = 7) -> dict:
        now = timezone.now()
        day_ago = now - timezone.timedelta(hours=24)
        period_start = now - timezone.timedelta(days=days)

        login_qs = _login_qs(tenant_id=tenant_id, platform_wide=platform_wide)
        period_logins = login_qs.filter(created_at__gte=period_start)

        google_qs = _login_qs(
            tenant_id=tenant_id,
            platform_wide=platform_wide,
            actions=(GOOGLE_LOGIN_ACTION,),
        )
        period_google = google_qs.filter(created_at__gte=period_start)

        users_qs = User.objects.filter(deleted_at__isnull=True)
        if not platform_wide and tenant_id:
            users_qs = users_qs.filter(default_tenant_id=tenant_id)

        by_email = list(
            period_logins.exclude(user__email__isnull=True)
            .values("user__email")
            .annotate(count=Count("id"), last_login=Max("created_at"))
            .order_by("-count")[:50]
        )

        google_by_email = list(
            period_google.exclude(user__email__isnull=True)
            .values("user__email")
            .annotate(count=Count("id"), last_login=Max("created_at"))
            .order_by("-count")[:50]
        )

        return {
            "generated_at": now.isoformat(),
            "scope": "platform" if platform_wide else "tenant",
            "days": days,
            "stats": {
                "logins_24h": login_qs.filter(created_at__gte=day_ago).count(),
                "logins_period": period_logins.count(),
                "unique_emails_period": period_logins.values("user__email").distinct().count(),
                "google_logins_24h": google_qs.filter(created_at__gte=day_ago).count(),
                "google_logins_period": period_google.count(),
                "google_unique_emails_period": period_google.values("user__email").distinct().count(),
                "users_total": users_qs.count(),
                "users_verified": users_qs.filter(email_verified_at__isnull=False).count(),
                "users_unverified": users_qs.filter(email_verified_at__isnull=True).count(),
            },
            "daily_logins": _daily_counts(login_qs.filter(created_at__gte=period_start), days=days),
            "daily_google_logins": _daily_counts(
                google_qs.filter(created_at__gte=period_start), days=days
            ),
            "logins_by_email": [
                {
                    "email": row["user__email"],
                    "count": row["count"],
                    "last_login": row["last_login"].isoformat() if row["last_login"] else None,
                }
                for row in by_email
            ],
            "google_logins_by_email": [
                {
                    "email": row["user__email"],
                    "count": row["count"],
                    "last_login": row["last_login"].isoformat() if row["last_login"] else None,
                }
                for row in google_by_email
            ],
            "recent_logins": _serialize_recent(login_qs),
            "recent_google_logins": _serialize_recent(google_qs),
        }

    @staticmethod
    def get_email_daily(
        *,
        email: str,
        tenant_id=None,
        platform_wide: bool = False,
        days: int = 7,
    ) -> dict:
        email = email.strip().lower()
        now = timezone.now()
        period_start = now - timezone.timedelta(days=days)
        qs = _login_qs(tenant_id=tenant_id, platform_wide=platform_wide).filter(
            user__email__iexact=email,
            created_at__gte=period_start,
        )
        google_qs = _login_qs(
            tenant_id=tenant_id,
            platform_wide=platform_wide,
            actions=(GOOGLE_LOGIN_ACTION,),
        ).filter(
            user__email__iexact=email,
            created_at__gte=period_start,
        )
        return {
            "email": email,
            "days": days,
            "total": qs.count(),
            "daily": _daily_counts(qs, days=days),
            "google_total": google_qs.count(),
            "daily_google": _daily_counts(google_qs, days=days),
        }
