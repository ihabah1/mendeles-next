"""Staff portal access — only team/admin roles, not every is_staff flag."""
from admin_panel.accounts.models import User


def is_staff_portal_user(user) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    return bool(
        user.is_staff
        and user.role in (User.Role.TEAM, User.Role.ADMIN)
    )
