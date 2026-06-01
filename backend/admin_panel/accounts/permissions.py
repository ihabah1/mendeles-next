from django.conf import settings


def is_portal_admin(user) -> bool:
    """Staff users may access the /manage dashboard."""
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_staff', False)
    )
