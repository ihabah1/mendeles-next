"""Kiosk booth auth and staff admin CRUD."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from admin_panel.portal.models import Kiosk
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


def _kiosk_to_dict(kiosk: Kiosk) -> dict:
    hint = None
    if kiosk.api_key and len(kiosk.api_key) >= 4:
        hint = f"…{kiosk.api_key[-4:]}"
    return {
        'id': kiosk.id,
        'name': kiosk.name,
        'email': kiosk.email,
        'location': kiosk.location,
        'isActive': kiosk.is_active,
        'apiKeyHint': hint,
        'lastLoginAt': kiosk.last_login_at.isoformat() if kiosk.last_login_at else None,
        'createdAt': kiosk.created_at.isoformat(),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsStaffUser])
def admin_kiosks(request):
    if request.method == 'GET':
        kiosks = Kiosk.objects.all()
        return Response({
            'kiosks': [_kiosk_to_dict(k) for k in kiosks],
            'count': kiosks.count(),
        })

    name = (request.data.get('name') or '').strip()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    location = (request.data.get('location') or '').strip()

    if not name:
        return Response({'detail': 'יש להזין שם דוכן.'}, status=status.HTTP_400_BAD_REQUEST)
    if not email:
        return Response({'detail': 'יש להזין אימייל.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 6:
        return Response({'detail': 'סיסמה חייבת להכיל לפחות 6 תווים.'}, status=status.HTTP_400_BAD_REQUEST)
    if Kiosk.objects.filter(email__iexact=email).exists():
        return Response({'detail': 'אימייל זה כבר בשימוש.'}, status=status.HTTP_400_BAD_REQUEST)

    kiosk = Kiosk(name=name, email=email, location=location, is_active=True)
    kiosk.set_password(password)
    kiosk.ensure_api_key()
    kiosk.save()

    return Response({'kiosk': _kiosk_to_dict(kiosk), 'detail': 'דוכן נוצר בהצלחה.'}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_kiosk_toggle(request, kiosk_id: int):
    try:
        kiosk = Kiosk.objects.get(pk=kiosk_id)
    except Kiosk.DoesNotExist:
        return Response({'detail': 'דוכן לא נמצא.'}, status=status.HTTP_404_NOT_FOUND)

    if 'is_active' in request.data:
        kiosk.is_active = bool(request.data['is_active'])
    else:
        kiosk.is_active = not kiosk.is_active
    kiosk.save(update_fields=['is_active', 'updated_at'])

    state = 'הופעל' if kiosk.is_active else 'הושבת'
    return Response({
        'kiosk': _kiosk_to_dict(kiosk),
        'detail': f'הדוכן {state}.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def kiosk_login(request):
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not email or not password:
        return Response({'detail': 'יש להזין אימייל וסיסמה.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        kiosk = Kiosk.objects.get(email__iexact=email)
    except Kiosk.DoesNotExist:
        return Response({'detail': 'פרטי התחברות שגויים.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not kiosk.is_active:
        return Response({'detail': 'הדוכן מושבת. פנה למנהל.'}, status=status.HTTP_403_FORBIDDEN)

    if not kiosk.check_password(password):
        return Response({'detail': 'פרטי התחברות שגויים.'}, status=status.HTTP_401_UNAUTHORIZED)

    kiosk.rotate_api_key()
    kiosk.last_login_at = timezone.now()
    kiosk.save(update_fields=['api_key', 'last_login_at', 'updated_at'])

    return Response({
        'apiKey': kiosk.api_key,
        'kiosk': {
            'id': kiosk.id,
            'name': kiosk.name,
            'email': kiosk.email,
            'location': kiosk.location,
        },
    })
