import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from rbac.infrastructure.models import Role, UserRole
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Create or update the bootstrap superuser (idempotent)."

    def handle(self, *args, **options):
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@admin.com").strip().lower()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "admin")

        User = get_user_model()
        tenant, _ = Tenant.objects.get_or_create(
            slug="platform",
            defaults={"name": "Mendeles Platform", "status": Tenant.Status.ACTIVE},
        )

        user = User.objects.filter(email=email).first()
        created = False
        if user is None:
            user = User.objects.create_superuser(
                email=email,
                password=password,
                first_name="Admin",
                last_name="Mendeles",
                default_tenant=tenant,
            )
            created = True
        else:
            user.first_name = user.first_name or "Admin"
            user.last_name = user.last_name or "Mendeles"
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.deleted_at = None
            user.email_verified_at = user.email_verified_at or timezone.now()
            user.default_tenant = user.default_tenant or tenant
            user.set_password(password)
            user.save()

        role = Role.objects.filter(slug="super_admin", tenant__isnull=True, deleted_at__isnull=True).first()
        if role:
            UserRole.objects.get_or_create(user=user, role=role, tenant=tenant)

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} superuser: {email}"))
