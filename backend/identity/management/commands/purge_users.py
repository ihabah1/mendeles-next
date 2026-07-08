from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from identity.application.purge_service import UserPurgeService

User = get_user_model()


class Command(BaseCommand):
    help = "Permanently delete users by email so the address can be used to register again."

    def add_arguments(self, parser):
        parser.add_argument(
            "emails",
            nargs="*",
            help="Email addresses to purge (e.g. test@example.com)",
        )
        parser.add_argument(
            "--purge-tenant",
            action="store_true",
            help="Also delete the user's tenant when no other users remain on it",
        )
        parser.add_argument(
            "--unverified-only",
            action="store_true",
            help="Only purge users whose email was never verified",
        )

    def handle(self, *args, **options):
        emails = [e.strip().lower() for e in options["emails"] if e.strip()]
        if not emails:
            raise CommandError("Provide at least one email address.")

        purge_tenant = options["purge_tenant"]
        unverified_only = options["unverified_only"]

        for email in emails:
            if unverified_only:
                user = User.objects.filter(email__iexact=email).first()
                if user and user.email_verified_at:
                    self.stdout.write(self.style.WARNING(f"SKIP {email} — already verified"))
                    continue

            result = UserPurgeService.purge_by_email(email=email, purge_tenant=purge_tenant)
            status = result["status"]
            if status == "not_found":
                self.stdout.write(self.style.WARNING(f"NOT FOUND: {email}"))
            else:
                extra = ""
                if result.get("tenant_purged"):
                    extra = " (+ tenant)"
                self.stdout.write(self.style.SUCCESS(f"PURGED: {email}{extra}"))
