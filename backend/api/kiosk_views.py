"""Kiosk booth auth and staff admin CRUD."""
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from admin_panel.accounts.models import User
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
        'ownerName': kiosk.owner_name,
        'location': kiosk.location,
        'phone': kiosk.phone,
        'email': kiosk.email,
        'isActive': kiosk.is_active,
        'active': kiosk.is_active,
        'pricePerTable': float(kiosk.price_per_table),
        'apiKeyHint': hint,
        'lastLoginAt': kiosk.last_login_at.isoformat() if kiosk.last_login_at else None,
        'createdAt': kiosk.created_at.isoformat(),
    }


def _parse_price(raw) -> Decimal | None:
    if raw is None or raw == '':
        return None
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None


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
    owner_name = (request.data.get('ownerName') or request.data.get('owner_name') or '').strip()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    location = (request.data.get('location') or '').strip()
    phone = (request.data.get('phone') or '').strip()
    price = _parse_price(request.data.get('pricePerTable', request.data.get('price_per_table')))

    if not name:
        return Response({'detail': 'יש להזין שם דוכן.'}, status=status.HTTP_400_BAD_REQUEST)
    if not email:
        return Response({'detail': 'יש להזין אימייל.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 6:
        return Response({'detail': 'סיסמה חייבת להכיל לפחות 6 תווים.'}, status=status.HTTP_400_BAD_REQUEST)
    if Kiosk.objects.filter(email__iexact=email).exists():
        return Response({'detail': 'אימייל זה כבר בשימוש.'}, status=status.HTTP_400_BAD_REQUEST)

    kiosk = Kiosk(
        name=name,
        owner_name=owner_name,
        email=email,
        location=location,
        phone=phone,
        is_active=True,
        price_per_table=price if price is not None else Decimal('3'),
    )
    kiosk.set_password(password)
    kiosk.ensure_api_key()
    kiosk.save()

    return Response({'kiosk': _kiosk_to_dict(kiosk), 'detail': 'דוכן נוצר בהצלחה.'}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def admin_kiosk_detail(request, kiosk_id: int):
    try:
        kiosk = Kiosk.objects.get(pk=kiosk_id)
    except Kiosk.DoesNotExist:
        return Response({'detail': 'דוכן לא נמצא.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'kiosk': _kiosk_to_dict(kiosk)})

    updates: list[str] = []

    if 'name' in request.data:
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'detail': 'שם דוכן לא יכול להיות ריק.'}, status=status.HTTP_400_BAD_REQUEST)
        kiosk.name = name
        updates.append('name')

    if 'ownerName' in request.data or 'owner_name' in request.data:
        kiosk.owner_name = (request.data.get('ownerName') or request.data.get('owner_name') or '').strip()
        updates.append('owner_name')

    if 'location' in request.data:
        kiosk.location = (request.data.get('location') or '').strip()
        updates.append('location')

    if 'phone' in request.data:
        kiosk.phone = (request.data.get('phone') or '').strip()
        updates.append('phone')

    if 'email' in request.data:
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'אימייל לא תקין.'}, status=status.HTTP_400_BAD_REQUEST)
        if Kiosk.objects.filter(email__iexact=email).exclude(pk=kiosk.pk).exists():
            return Response({'detail': 'אימייל זה כבר בשימוש.'}, status=status.HTTP_400_BAD_REQUEST)
        kiosk.email = email
        updates.append('email')

    if 'password' in request.data and request.data.get('password'):
        password = request.data['password']
        if len(password) < 6:
            return Response({'detail': 'סיסמה חייבת להכיל לפחות 6 תווים.'}, status=status.HTTP_400_BAD_REQUEST)
        kiosk.set_password(password)
        updates.append('password_hash')

    if 'is_active' in request.data or 'active' in request.data:
        raw = request.data.get('is_active', request.data.get('active'))
        kiosk.is_active = bool(raw)
        updates.append('is_active')

    if 'pricePerTable' in request.data or 'price_per_table' in request.data:
        price = _parse_price(request.data.get('pricePerTable', request.data.get('price_per_table')))
        if price is None or price < 0:
            return Response({'detail': 'מחיר לטבלה לא תקין.'}, status=status.HTTP_400_BAD_REQUEST)
        kiosk.price_per_table = price
        updates.append('price_per_table')

    if not updates:
        return Response({'detail': 'לא נשלחו שדות לעדכון.'}, status=status.HTTP_400_BAD_REQUEST)

    updates.append('updated_at')
    kiosk.save(update_fields=updates)

    return Response({
        'kiosk': _kiosk_to_dict(kiosk),
        'detail': 'הדוכן עודכן.',
    })


@api_view(['POST'])
@permission_classes([IsStaffUser])
def admin_kiosk_toggle(request, kiosk_id: int):
    """Legacy toggle — prefer PATCH /api/admin/kiosks/<id>/"""
    try:
        kiosk = Kiosk.objects.get(pk=kiosk_id)
    except Kiosk.DoesNotExist:
        return Response({'detail': 'דוכן לא נמצא.'}, status=status.HTTP_404_NOT_FOUND)

    if 'is_active' in request.data or 'active' in request.data:
        kiosk.is_active = bool(request.data.get('is_active', request.data.get('active')))
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
    """POST /api/kiosk/login/ — booth software login → apiKey."""
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
            'ownerName': kiosk.owner_name,
            'email': kiosk.email,
            'phone': kiosk.phone,
            'location': kiosk.location,
            'pricePerTable': float(kiosk.price_per_table),
            'active': kiosk.is_active,
        },
    })


@api_view(['GET'])
@permission_classes([IsStaffUser])
def admin_kiosk_site_users(request):
    """GET /api/admin/kiosks/site-users/ — customers list for admin context."""
    from django.conf import settings
    from django.db.models import Q

    q = (request.query_params.get('q') or '').strip()
    qs = User.objects.exclude(email__iexact=settings.ADMIN_EMAIL).filter(
        role__in=[User.Role.CUSTOMER, User.Role.TEAM],
    )
    if q:
        qs = qs.filter(
            Q(email__icontains=q)
            | Q(full_name__icontains=q)
            | Q(first_name__icontains=q)
            | Q(phone__icontains=q),
        )
    users = []
    for u in qs.order_by('-date_joined')[:100]:
        users.append({
            'id': u.id,
            'email': u.email,
            'displayName': u.display_name,
            'phone': u.phone or '',
            'role': u.role,
            'dateJoined': u.date_joined.isoformat() if u.date_joined else None,
        })
    return Response({'users': users, 'count': len(users)})
