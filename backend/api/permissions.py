"""Object-level permissions shared across the API viewsets."""
from rest_framework import permissions

from api.staff import is_staff_portal_user


class IsAdminOrOwner(permissions.BasePermission):
    """Staff users get full access; everyone else only their own objects.

    The viewset declares which attribute identifies the owner via `owner_field`
    (defaults to `customer`).
    """

    def has_object_permission(self, request, view, obj):
        if is_staff_portal_user(request.user):
            return True
        owner_field = getattr(view, 'owner_field', 'customer')
        return getattr(obj, owner_field, None) == request.user


class IsStaffOrReadOnlyOwner(permissions.BasePermission):
    """Owners may read their object; only staff may modify it."""

    def has_object_permission(self, request, view, obj):
        owner_field = getattr(view, 'owner_field', 'user')
        is_owner = getattr(obj, owner_field, None) == request.user
        if request.method in permissions.SAFE_METHODS:
            return is_owner or is_staff_portal_user(request.user)
        return is_staff_portal_user(request.user)
