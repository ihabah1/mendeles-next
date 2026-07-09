"""Tenant credit balance for client content creation."""

from __future__ import annotations

from django.db import transaction
from django.db.models import F

from core.exceptions.base import ValidationError
from tenancy.infrastructure.models import Tenant

NEW_CLIENT_CREDITS = 15
PRODUCT_CREDIT_COST = 15


class CreditService:
    @staticmethod
    def get_balance(tenant_id) -> int:
        return Tenant.objects.filter(id=tenant_id).values_list("credits_balance", flat=True).first() or 0

    @staticmethod
    @transaction.atomic
    def grant(*, tenant_id, amount: int, reason: str) -> int:
        if amount <= 0:
            raise ValidationError("grant amount must be positive")
        Tenant.objects.filter(id=tenant_id).update(credits_balance=F("credits_balance") + amount)
        return CreditService.get_balance(tenant_id)

    @staticmethod
    @transaction.atomic
    def deduct(*, tenant_id, amount: int, reason: str) -> int:
        if amount <= 0:
            raise ValidationError("deduct amount must be positive")
        updated = Tenant.objects.filter(id=tenant_id, credits_balance__gte=amount).update(
            credits_balance=F("credits_balance") - amount
        )
        if not updated:
            balance = CreditService.get_balance(tenant_id)
            raise ValidationError(
                f"אין מספיק קרדיטים (יתרה: {balance}, נדרש: {amount})",
                details={"balance": balance, "required": amount, "reason": reason},
            )
        return CreditService.get_balance(tenant_id)

    @staticmethod
    def grant_new_client_bonus(tenant_id) -> int:
        return CreditService.grant(tenant_id=tenant_id, amount=NEW_CLIENT_CREDITS, reason="new_client_bonus")
