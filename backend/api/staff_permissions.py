"""DRF permission class for the staff admin portal."""
from rest_framework import permissions

from api.staff import is_staff_portal_user


class IsStaffPortalUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_staff_portal_user(request.user)
