"""Staff API — view and adjust customer wallet balances."""
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import ActionLog

from api.permissions_views import _get_managed_user, _managed_users
from api.services.user_setup import ensure_customer_records
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser

MAX_BALANCE = Decimal('50000')
MIN_BALANCE = Decimal('0')


def _balance_user_summary(user) -> dict:
    _, credit = ensure_customer_records(user)
    return {
        'id': user.id,
        'email': user.email,
        'displayName': user.display_name,
        'fullName': user.full_name or '',
        'phone': user.phone or '',
        'role': user.role,
        'roleLabel': user.get_role_display(),
        'balanceIls': float(credit.balance_ils),
        'totalTopupIls': float(credit.total_topup_ils),
        'totalChargeIls': float(credit.total_charge_ils),
        'dateJoined': user.date_joined.isoformat(),
    }


def _log_balance_change(request, customer, event: str, details: str) -> None:
    ActionLog.objects.create(
        customer=customer,
        performed_by=request.user,
        event=event,
        details=details[:500],
    )


def _parse_amount(raw) -> Decimal | None:
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([IsStaffUser])
def balance_users_list(request):
    q = (request.query_params.get('q') or '').strip()
    role = (request.query_params.get('role') or '').strip()

    qs = _managed_users().select_related('credit_account')
    if q:
        qs = qs.filter(
            Q(email__icontains=q)
            | Q(full_name__icontains=q)
            | Q(first_name__icontains=q)
            | Q(phone__icontains=q)
            | Q(username__icontains=q),
        )
    if role in ('customer', 'team'):
        qs = qs.filter(role=role)

    users = [_balance_user_summary(u) for u in qs.order_by('-date_joined')[:300]]
    return Response({'users': users, 'count': len(users)})


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def balance_user_detail(request, user_id: int):
    user = _get_managed_user(user_id)
    if not user:
        return Response({'error': 'משתמש לא נמצא'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(_balance_user_summary(user))

    note = (request.data.get('note') or '').strip()[:200]
    _, credit = ensure_customer_records(user)
    old_balance = credit.balance_ils

    if 'balance_ils' in request.data:
        new_balance = _parse_amount(request.data.get('balance_ils'))
        if new_balance is None:
            return Response({'error': 'יתרה לא תקינה'}, status=status.HTTP_400_BAD_REQUEST)
        if new_balance < MIN_BALANCE or new_balance > MAX_BALANCE:
            return Response(
                {'error': f'יתרה חייבת להיות בין {MIN_BALANCE} ל-{MAX_BALANCE}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delta = new_balance - old_balance
        credit.balance_ils = new_balance
    elif 'adjust_ils' in request.data:
        delta = _parse_amount(request.data.get('adjust_ils'))
        if delta is None:
            return Response({'error': 'סכום שינוי לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
        new_balance = old_balance + delta
        if new_balance < MIN_BALANCE or new_balance > MAX_BALANCE:
            return Response(
                {'error': f'היתרה לאחר השינוי חייבת להיות בין {MIN_BALANCE} ל-{MAX_BALANCE}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        credit.balance_ils = new_balance
    else:
        return Response({'error': 'ספק balance_ils או adjust_ils'}, status=status.HTTP_400_BAD_REQUEST)

    if delta > 0:
        credit.total_topup_ils += delta
    credit.save(update_fields=['balance_ils', 'total_topup_ils', 'updated_at'])

    details = f'amount:{delta:+} old:{old_balance} new:{credit.balance_ils}'
    if note:
        details += f' note:{note}'
    _log_balance_change(request, user, 'wallet.admin_adjust', details)

    return Response({
        'detail': 'יתרה עודכנה',
        'deltaIls': float(delta),
        'user': _balance_user_summary(user),
    })
