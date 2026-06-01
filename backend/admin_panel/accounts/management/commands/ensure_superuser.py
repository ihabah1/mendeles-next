"""Management command: ensure the bootstrap superuser exists."""
from django.core.management.base import BaseCommand

from admin_panel.accounts.bootstrap import ensure_bootstrap_admin


class Command(BaseCommand):
    help = 'מבטיח superuser קבוע (admin@admin.com / admin) — שומר היסטוריה, מאפס סיסמה'

    def handle(self, *args, **options):
        admin, created = ensure_bootstrap_admin()
        verb = 'created' if created else 'updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'{verb}: {admin.email} (id={admin.id}, superuser={admin.is_superuser})',
            ),
        )
