"""Setup for newly registered client tenants."""

from __future__ import annotations

from automation.infrastructure.models import AutomationQueue
from identity.application.inbox_service import InboxService
from tenancy.application.credit_service import NEW_CLIENT_CREDITS, CreditService


class OnboardingService:
    @staticmethod
    def setup_new_client(*, tenant, user, request) -> None:
        CreditService.grant_new_client_bonus(tenant.id)
        AutomationQueue.objects.get_or_create(
            tenant=tenant,
            slug="default",
            defaults={"name": "Default Queue", "is_default": True},
        )
        InboxService.send_message(
            tenant_id=tenant.id,
            sender=None,
            recipient=user,
            subject="ברוכים הבאים ל-Mendeles",
            body=(
                f"שלום {user.first_name},\n\n"
                f"קיבלתם {NEW_CLIENT_CREDITS} קרדיטים לפתיחה — כל בקשה לדף נחיתה או מאמר עולה 15 קרדיטים.\n"
                "שלחו בקשה ליצירה מהדשבורד ונעדכן אתכם כשהתוכן מוכן."
            ),
            request=request,
        )
