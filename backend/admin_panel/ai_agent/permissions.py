from django.conf import settings

from admin_panel.portal.service_flags import is_enabled as service_flag_enabled


def can_use_ai_agent(user) -> bool:
    """Superuser, staff, or configured admin email when AI agent flag is on."""
    if not service_flag_enabled('ai_agent'):
        return False
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if user.is_staff:
        return True
    email = getattr(user, 'email', '') or ''
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'admin@admin.com')
    return email.lower() == admin_email.lower()
