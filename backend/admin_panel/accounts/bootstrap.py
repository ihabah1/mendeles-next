"""מנהל ברירת מחדל – נוצר/מתוקן אוטומטית אחרי migrate (שומר את אותו user id והיסטוריה)."""
from django.conf import settings

from admin_panel.accounts.models import User


def _bootstrap_email() -> str:
    return getattr(settings, 'BOOTSTRAP_ADMIN_EMAIL', 'admin@admin.com').lower().strip()


def _bootstrap_password() -> str:
    return getattr(settings, 'BOOTSTRAP_ADMIN_PASSWORD', 'admin')


def ensure_bootstrap_admin() -> tuple[User, bool]:
    """
    מבטיח superuser קבוע (ברירת מחדל admin@admin.com / admin).

    - לא מוחק משתמשים קיימים → היסטוריית הזמנות, לוגים ו-action logs נשמרים.
    - מאפס סיסמה ודגלים בכל הרצה כדי שהחשבון תמיד נגיש.
    """
    email = _bootstrap_email()
    admin = User.objects.filter(email__iexact=email).first()
    created = admin is None

    if created:
        admin = User(
            email=email,
            full_name='מנהל מערכת',
            phone='0500000000',
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            email_verified=True,
            phone_verified=True,
        )
    else:
        # אותו משתמש — רק מוודאים הרשאות (לא נוגעים ב-date_joined / last_login)
        admin.is_staff = True
        admin.is_superuser = True
        admin.is_active = True
        admin.email_verified = True
        admin.role = User.Role.ADMIN
        if not admin.full_name:
            admin.full_name = 'מנהל מערכת'

    admin.set_password(_bootstrap_password())
    admin.save()
    return admin, created
