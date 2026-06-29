from django.core.management.base import BaseCommand

from rbac.application.permission_registry import PERMISSIONS, ROLE_PERMISSIONS, SYSTEM_ROLES
from rbac.infrastructure.models import Permission, Role, RolePermission


class Command(BaseCommand):
    help = "Seed system permissions and roles"

    def handle(self, *args, **options):
        for codename, module, action, description in PERMISSIONS:
            Permission.objects.update_or_create(
                codename=codename,
                defaults={"module": module, "action": action, "description": description},
            )

        all_perms = {p.codename: p for p in Permission.objects.all()}

        for slug, name, description in SYSTEM_ROLES:
            role, _ = Role.objects.update_or_create(
                slug=slug,
                tenant=None,
                defaults={"name": name, "description": description, "is_system": True},
            )
            RolePermission.objects.filter(role=role).delete()
            codes = ROLE_PERMISSIONS.get(slug, [])
            if codes == ["*"]:
                codes = list(all_perms.keys())
            for code in codes:
                perm = all_perms.get(code)
                if perm:
                    RolePermission.objects.get_or_create(role=role, permission=perm)

        self.stdout.write(self.style.SUCCESS("RBAC seeded successfully"))
