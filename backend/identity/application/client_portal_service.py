"""Ensure self-registered users use the client portal role."""

from __future__ import annotations

from audit.infrastructure.models import AuditLog
from rbac.infrastructure.models import Role, UserRole
from tenancy.application.credit_service import CreditService


def _ensure_system_roles_seeded() -> None:
    if Role.objects.filter(slug="client", tenant__isnull=True, is_system=True).exists():
        return
    from rbac.management.commands.seed_rbac import Command as SeedRbacCommand

    SeedRbacCommand().handle()


def ensure_client_portal_user(user, *, request=None) -> None:
    """Convert self-registered business_owner to client; grant credits if missing."""
    if not user or not user.default_tenant_id:
        return

    tenant_id = user.default_tenant_id

    if UserRole.objects.filter(
        user=user,
        role__slug__in=("super_admin", "platform_admin"),
        tenant_id=tenant_id,
    ).exists():
        return

    if UserRole.objects.filter(user=user, role__slug="client", tenant_id=tenant_id).exists():
        return

    if not AuditLog.objects.filter(user=user, action="user.registered").exists():
        return

    if not UserRole.objects.filter(
        user=user,
        role__slug="business_owner",
        tenant_id=tenant_id,
    ).exists():
        return

    _ensure_system_roles_seeded()
    client_role = Role.objects.get(slug="client", tenant__isnull=True, is_system=True)
    UserRole.objects.filter(
        user=user,
        tenant_id=tenant_id,
        role__slug="business_owner",
    ).delete()
    UserRole.objects.get_or_create(user=user, role=client_role, tenant_id=tenant_id)

    if CreditService.get_balance(tenant_id) == 0:
        CreditService.grant_new_client_bonus(tenant_id)

    if request is not None:
        from automation.infrastructure.models import AutomationQueue

        AutomationQueue.objects.get_or_create(
            tenant_id=tenant_id,
            slug="default",
            defaults={"name": "Default Queue", "is_default": True},
        )
