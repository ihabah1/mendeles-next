"""Staff-only API for runtime service toggles."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from admin_panel.portal.service_flags import list_flags, update_flags
from api.staff import is_staff_portal_user


class IsStaffUser(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_staff_portal_user(request.user)


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def service_flags_view(request):
    if request.method == 'GET':
        return Response({'flags': list_flags()})

    raw = request.data.get('flags')
    if not isinstance(raw, dict):
        return Response(
            {'detail': 'יש לשלוח אובייקט flags עם מפתחות וערכי boolean.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    updates = {k: bool(v) for k, v in raw.items()}
    if not updates:
        return Response(
            {'detail': 'לא נשלחו דגלים לעדכון.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'flags': update_flags(updates)})
