import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from rbac.infrastructure.models import Role, UserRole
from tenancy.infrastructure.models import Tenant


class Command(BaseCommand):
    help = "Create or update the bootstrap superuser (idempotent)."

    def handle(self, *args, **options):
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")

        if not email or not password:
            if settings.DEBUG:
                email = email or "admin@admin.com"
                password = password or "admin"
            else:
                self.stdout.write(
                    self.style.WARNING(
                        "Skipping bootstrap superuser: set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD"
                    )
                )
                return

        if not settings.DEBUG and len(password) < 10:
            self.stdout.write(self.style.ERROR("BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters"))
            return

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

        from seo.application.settings_service import SEOSettingsService

        SEOSettingsService.seed_defaults(tenant.id)

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} superuser: {email}"))
