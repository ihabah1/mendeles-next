"""Staff API — grant/revoke customer permissions and Premium access."""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.accounts.models import User
from admin_panel.portal.models import ActionLog, CustomerPermission, Subscription

from api.services.user_setup import ensure_customer_records
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


PERM_META = {
    CustomerPermission.Perm.PLACE_ORDER: {
        'label': 'ביצוע הזמנות',
        'hint': 'מאפשר שליחת טפסי לוטו מהאתר',
    },
    CustomerPermission.Perm.USE_WALLET: {
        'label': 'שימוש בארנק',
        'hint': 'טעינה וחיוב מיתרת הארנק',
    },
    CustomerPermission.Perm.VIEW_WINS: {
        'label': 'צפייה בזכיות',
        'hint': 'גישה להודעות ולתוצאות זכייה',
    },
    CustomerPermission.Perm.SUBSCRIPTION: {
        'label': 'מנוי Premium',
        'hint': 'גישה ל-200 סטים, מילוי אוטומטי ו-777',
    },
    CustomerPermission.Perm.PRINT_EXPORT: {
        'label': 'ייצוא להדפסה',
        'hint': 'שליחה למדפסת חיצונית',
    },
}


def _managed_users():
    return User.objects.exclude(email__iexact=settings.ADMIN_EMAIL).filter(
        role__in=[User.Role.CUSTOMER, User.Role.TEAM],
    )


def _get_managed_user(pk: int) -> User | None:
    return _managed_users().filter(pk=pk).first()


def _has_active_subscription(user) -> bool:
    return Subscription.objects.filter(
        customer=user,
        status='active',
        expires_at__gt=timezone.now(),
    ).exists()


def _has_premium_permission(user) -> bool:
    return CustomerPermission.objects.filter(
        customer=user,
        permission=CustomerPermission.Perm.SUBSCRIPTION,
        is_granted=True,
    ).exists()


def _is_premium(user) -> bool:
    return _has_active_subscription(user) or _has_premium_permission(user)


def _ensure_permission_rows(user, updated_by=None):
    for perm, _ in CustomerPermission.Perm.choices:
        CustomerPermission.objects.get_or_create(
            customer=user,
            permission=perm,
            defaults={'is_granted': True, 'updated_by': updated_by},
        )


def _permissions_list(user) -> list[dict]:
    granted = {
        p.permission: p.is_granted
        for p in user.custom_permissions.all()
    }
    rows = []
    for key, label in CustomerPermission.Perm.choices:
        meta = PERM_META.get(key, {'label': label, 'hint': ''})
        rows.append({
            'key': key,
            'label': meta['label'],
            'hint': meta['hint'],
            'granted': granted.get(key, False),
        })
    return rows


def _user_summary(user) -> dict:
    sub = (
        Subscription.objects.filter(customer=user, status='active')
        .order_by('-expires_at')
        .first()
    )
    _, credit = ensure_customer_records(user)
    return {
        'id': user.id,
        'email': user.email,
        'displayName': user.display_name,
        'fullName': user.full_name or '',
        'phone': user.phone or '',
        'role': user.role,
        'roleLabel': user.get_role_display(),
        'isActive': user.is_active,
        'isStaff': user.is_staff,
        'isPremium': _is_premium(user),
        'premiumExpiresAt': sub.expires_at.isoformat() if sub and sub.expires_at else None,
        'dateJoined': user.date_joined.isoformat(),
        'balanceIls': float(credit.balance_ils),
        'permissions': _permissions_list(user),
    }


def _log(request, event: str, customer: User | None = None, details: str = ''):
    ActionLog.objects.create(
        customer=customer,
        performed_by=request.user,
        event=event,
        details=details[:500],
    )


def _require_admin_for_delete(request) -> Response | None:
    if not getattr(request.user, 'is_admin', False):
        return Response(
            {'error': 'רק מנהל ראשי יכול למחוק משתמשים'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _delete_managed_user(request, user: User) -> Response | None:
    """Delete a managed user. Returns error Response or None on success."""
    denied = _require_admin_for_delete(request)
    if denied:
        return denied
    if user.pk == request.user.pk:
        return Response({'error': 'לא ניתן למחוק את המשתמש המחובר'}, status=status.HTTP_400_BAD_REQUEST)
    email = user.email
    _log(request, 'user.deleted', details=email)
    user.delete()
    return None


def _grant_premium_with_request(request, user: User, days: int = 30):
    ensure_customer_records(user)
    now = timezone.now()
    expires = now + timedelta(days=max(1, days))
    Subscription.objects.create(
        customer=user,
        plan=Subscription.Plan.MONTHLY,
        price_ils=Decimal('0'),
        status='active',
        starts_at=now,
        expires_at=expires,
    )
    CustomerPermission.objects.update_or_create(
        customer=user,
        permission=CustomerPermission.Perm.SUBSCRIPTION,
        defaults={'is_granted': True, 'updated_by': request.user},
    )
    _log(request, 'premium.granted', user, f'{days} days')


def _revoke_premium_with_request(request, user: User):
    Subscription.objects.filter(customer=user, status='active').update(
        status='cancelled',
        expires_at=timezone.now(),
    )
    CustomerPermission.objects.filter(
        customer=user,
        permission=CustomerPermission.Perm.SUBSCRIPTION,
    ).update(is_granted=False, updated_by=request.user)
    _log(request, 'premium.revoked', user)


@api_view(['GET'])
@permission_classes([IsStaffUser])
def permissions_users_list(request):
    q = (request.query_params.get('q') or '').strip()
    role = (request.query_params.get('role') or '').strip()

    qs = _managed_users().prefetch_related('custom_permissions')
    if q:
        qs = qs.filter(
            Q(email__icontains=q)
            | Q(full_name__icontains=q)
            | Q(first_name__icontains=q)
            | Q(phone__icontains=q),
        )
    if role in (User.Role.CUSTOMER, User.Role.TEAM):
        qs = qs.filter(role=role)

    users = [_user_summary(u) for u in qs.order_by('-date_joined')[:200]]
    return Response({'users': users, 'count': len(users)})


@api_view(['GET', 'PATCH', 'POST', 'DELETE'])
@permission_classes([IsStaffUser])
def permissions_user_detail(request, user_id: int):
    user = _get_managed_user(user_id)
    if not user:
        return Response({'error': 'משתמש לא נמצא'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        err = _delete_managed_user(request, user)
        if err:
            return err
        return Response({'detail': f'משתמש {user.email} נמחק'})

    if request.method == 'GET':
        _ensure_permission_rows(user, request.user)
        return Response(_user_summary(user))

    if request.method == 'POST':
        action = request.data.get('action')
        if action == 'grant_premium':
            days = int(request.data.get('days') or 30)
            _grant_premium_with_request(request, user, days)
            return Response({'detail': f'Premium הופעל ל-{days} ימים', 'user': _user_summary(user)})
        if action == 'revoke_premium':
            _revoke_premium_with_request(request, user)
            return Response({'detail': 'Premium בוטל', 'user': _user_summary(user)})
        return Response({'error': 'פעולה לא תקינה'}, status=status.HTTP_400_BAD_REQUEST)

    # PATCH
    _ensure_permission_rows(user, request.user)

    if request.data.get('grant_all'):
        for perm, _ in CustomerPermission.Perm.choices:
            CustomerPermission.objects.update_or_create(
                customer=user,
                permission=perm,
                defaults={'is_granted': True, 'updated_by': request.user},
            )
        _log(request, 'permissions.grant_all', user)
        return Response({'detail': 'כל ההרשאות הופעלו', 'user': _user_summary(user)})

    if request.data.get('revoke_all'):
        CustomerPermission.objects.filter(customer=user).update(
            is_granted=False,
            updated_by=request.user,
        )
        _log(request, 'permissions.revoke_all', user)
        return Response({'detail': 'כל ההרשאות בוטלו', 'user': _user_summary(user)})

    perm_key = request.data.get('permission')
    if perm_key in dict(CustomerPermission.Perm.choices):
        granted = bool(request.data.get('granted', True))
        CustomerPermission.objects.update_or_create(
            customer=user,
            permission=perm_key,
            defaults={'is_granted': granted, 'updated_by': request.user},
        )
        _log(request, 'permission.updated', user, f'{perm_key}={granted}')
        return Response({'detail': 'הרשאה עודכנה', 'user': _user_summary(user)})

    if 'is_active' in request.data:
        user.is_active = bool(request.data['is_active'])
        user.save(update_fields=['is_active'])
        _log(request, 'user.active_changed', user, str(user.is_active))
        return Response({'detail': 'סטטוס פעילות עודכן', 'user': _user_summary(user)})

    new_role = request.data.get('role')
    if new_role in (User.Role.CUSTOMER, User.Role.TEAM):
        if not getattr(request.user, 'is_admin', False):
            return Response(
                {'error': 'רק מנהל ראשי יכול לשנות תפקיד צוות'},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.role = new_role
        user.is_staff = new_role == User.Role.TEAM
        user.save(update_fields=['role', 'is_staff'])
        _log(request, 'user.role_changed', user, new_role)
        return Response({'detail': 'תפקיד עודכן', 'user': _user_summary(user)})

    return Response({'error': 'לא סופק עדכון'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsStaffUser])
def permissions_users_bulk_delete(request):
    denied = _require_admin_for_delete(request)
    if denied:
        return denied

    raw_ids = request.data.get('user_ids') or []
    if not isinstance(raw_ids, list) or not raw_ids:
        return Response({'error': 'לא נבחרו משתמשים למחיקה'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_ids = [int(uid) for uid in raw_ids]
    except (TypeError, ValueError):
        return Response({'error': 'רשימת מזהים לא תקינה'}, status=status.HTTP_400_BAD_REQUEST)

    deleted: list[str] = []
    skipped: list[str] = []

    for uid in user_ids:
        user = _get_managed_user(uid)
        if not user:
            skipped.append(str(uid))
            continue
        if user.pk == request.user.pk:
            skipped.append(user.email)
            continue
        email = user.email
        _log(request, 'user.deleted', details=email)
        user.delete()
        deleted.append(email)

    if not deleted:
        return Response(
            {'error': 'לא נמחק אף משתמש', 'skipped': skipped},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        'detail': f'נמחקו {len(deleted)} משתמשים',
        'deleted': deleted,
        'skipped': skipped,
        'count': len(deleted),
    })
