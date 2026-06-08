"""Lotto API — my-sets, submit, subscribe."""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import ActionLog, CustomerPermission, LottoSet, Order, Subscription

from .lotto_service import (
    COMMISSION,
    TABLE_PRICE,
    gen_order_number,
    get_unique_sets_for_user,
    lotto_set_to_api,
    read_last_lottery_id,
)
from api.staff import is_staff_portal_user

from .services.pais_draw import read_draw_data
from .services.user_setup import ensure_customer_records


def _log_charge(request, event: str, details: str) -> None:
    ActionLog.objects.create(
        customer=request.user,
        performed_by=request.user,
        event=event,
        details=details,
    )


def _has_active_subscription(user) -> bool:
    if Subscription.objects.filter(
        customer=user,
        status='active',
        expires_at__gt=timezone.now(),
    ).exists():
        return True
    return CustomerPermission.objects.filter(
        customer=user,
        permission=CustomerPermission.Perm.SUBSCRIPTION,
        is_granted=True,
    ).exists()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def lotto_draw(request):
    """GET /api/lotto/draw/ — last published draw + prize table."""
    data = read_draw_data()
    if not data:
        return Response({'last_draw': None, 'prizes': None, 'updated_at': None})
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_sets(request):
    """GET /api/lotto/my-sets/?draw_date=YYYY-MM-DD"""
    draw_date = request.query_params.get('draw_date', '').strip()
    qs = LottoSet.objects.filter(customer=request.user)
    if draw_date:
        qs = qs.filter(draw_date=draw_date)
    qs = qs.order_by('-draw_date', 'set_index')
    sets = [lotto_set_to_api(row) for row in qs]
    tier = 'premium' if _has_active_subscription(request.user) or sets else 'registered'
    return Response({'sets': sets, 'count': len(sets), 'tier': tier})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def subscribe(request):
    """POST /api/lotto/subscribe/ { plan: weekly|monthly, draw_date? }"""
    plan = request.data.get('plan')
    if plan not in (Subscription.Plan.WEEKLY, Subscription.Plan.MONTHLY):
        return Response({'error': 'תכנית לא תקינה'}, status=status.HTTP_400_BAD_REQUEST)

    price = Decimal('25.0') if plan == Subscription.Plan.WEEKLY else Decimal('50.0')
    _, credit = ensure_customer_records(request.user)
    if credit.balance_ils < price:
        return Response(
            {'error': 'יתרה לא מספיקה', 'need_topup': True},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    now = timezone.now()
    days = 7 if plan == Subscription.Plan.WEEKLY else 30
    expires = now + timezone.timedelta(days=days)
    draw_date = request.data.get('draw_date') or now.date().isoformat()
    sets_data = get_unique_sets_for_user(request.user, 200)

    with transaction.atomic():
        credit.balance_ils -= price
        credit.total_charge_ils += price
        credit.save(update_fields=['balance_ils', 'total_charge_ils', 'updated_at'])

        sub = Subscription.objects.create(
            customer=request.user,
            plan=plan,
            price_ils=price,
            status='active',
            starts_at=now,
            expires_at=expires,
        )
        LottoSet.objects.filter(customer=request.user, draw_date=draw_date).delete()
        LottoSet.objects.bulk_create([
            LottoSet(
                customer=request.user,
                subscription=sub,
                draw_date=draw_date,
                set_index=s['set_index'],
                n1=s['n1'], n2=s['n2'], n3=s['n3'],
                n4=s['n4'], n5=s['n5'], n6=s['n6'],
                strong=s['strong'],
            )
            for s in sets_data
        ])
        _log_charge(request, 'wallet.charge', f'amount:-{price} subscription:{plan}')

    return Response({
        'status': 'ok',
        'sets_count': len(sets_data),
        'expires_at': expires.isoformat(),
        'plan': plan,
        'draw_date': draw_date,
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_order(request):
    """POST /api/lotto/submit/ { sets, draw_date?, is_double? }"""
    sets = request.data.get('sets') or []
    is_double = bool(request.data.get('is_double'))

    if len(sets) < 2:
        return Response({'error': 'מינימום 2 טבלאות'}, status=status.HTTP_400_BAD_REQUEST)
    if len(sets) % 2 != 0:
        return Response({'error': 'שליחה בזוגות בלבד'}, status=status.HTTP_400_BAD_REQUEST)
    if len(sets) > 200:
        return Response({'error': 'מקסימום 200 טבלאות'}, status=status.HTTP_400_BAD_REQUEST)

    for i, s in enumerate(sets):
        nums = [s.get('n1'), s.get('n2'), s.get('n3'), s.get('n4'), s.get('n5'), s.get('n6')]
        if not all(isinstance(n, int) and 1 <= n <= 37 for n in nums):
            return Response({'error': f'סט {i + 1}: מספרים לא תקינים'}, status=status.HTTP_400_BAD_REQUEST)
        if len(set(nums)) != 6:
            return Response({'error': f'סט {i + 1}: מספרים כפולים'}, status=status.HTTP_400_BAD_REQUEST)
        strong = s.get('strong')
        if not isinstance(strong, int) or not 1 <= strong <= 7:
            return Response({'error': f'סט {i + 1}: חזק לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    multiplier = Decimal('2') if is_double else Decimal('1')
    price_per_table = (TABLE_PRICE + COMMISSION) * multiplier
    total = price_per_table * len(sets)

    _, credit = ensure_customer_records(request.user)
    if credit.balance_ils < total:
        shortfall = float(total - credit.balance_ils)
        return Response(
            {
                'error': 'יתרה לא מספיקה',
                'need_topup': True,
                'shortfall': shortfall,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    order_number = gen_order_number()
    draw_date = request.data.get('draw_date') or timezone.localdate().isoformat()
    lottery_id = read_last_lottery_id()

    sets_json = [
        {
            'set_index': s.get('set_index', idx + 1),
            'nums': [s['n1'], s['n2'], s['n3'], s['n4'], s['n5'], s['n6']],
            'strong': s['strong'],
            'display': f"{s['n1']} {s['n2']} {s['n3']} {s['n4']} {s['n5']} {s['n6']} | {s['strong']}",
        }
        for idx, s in enumerate(sets)
    ]

    with transaction.atomic():
        credit.balance_ils -= total
        credit.total_charge_ils += total
        credit.save(update_fields=['balance_ils', 'total_charge_ils', 'updated_at'])

        order = Order.objects.create(
            customer=request.user,
            order_number=order_number,
            draw_name=draw_date,
            forms_count=len(sets),
            amount_ils=total,
            table_price_ils=TABLE_PRICE * multiplier,
            commission_ils=COMMISSION,
            sets_json=sets_json,
            is_double=is_double,
            lottery_id=lottery_id,
            status=Order.Status.PAID,
        )
        _log_charge(
            request,
            'wallet.charge',
            f'amount:-{total} order:{order_number} ({len(sets)} tables)',
        )

    from api.services.print_queue_service import auto_enqueue_enabled, enqueue_order

    if auto_enqueue_enabled():
        enqueue_order(order)

    return Response({
        'status': 'ok',
        'order_number': order_number,
        'tables_count': len(sets),
        'total_ils': float(total),
        'message': f'ההזמנה {order_number} התקבלה ונכנסה לתור הדפסה!',
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def print_summary(request):
    """POST /api/lotto/print/ — staff-only legacy; customers use submit + print queue."""
    if not is_staff_portal_user(request.user):
        return Response(
            {
                'detail': 'הדפסה מתבצעת על ידי הצוות בתור ההדפסה — ההזמנה שלך כבר בתור.',
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    from api.services.print_service import (
        PrintError,
        _print_payload_mode,
        build_forms_payload_for_user,
        normalize_print_tables,
        print_configured,
        print_success_detail,
        send_print_payload,
    )

    if not print_configured():
        return Response(
            {'detail': 'שרת ההדפסה לא מוגדר (PRINT_SERVER_URL / PRINT_API_KEY)'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if _print_payload_mode() in ('pdf', 'pdf_url'):
        return Response(
            {'detail': 'הדפסת טופס לוטו דורשת PRINT_PAYLOAD_MODE=forms'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tables = normalize_print_tables(request.data.get('tables'))
    if not tables:
        return Response(
            {'detail': 'מלא לפחות טבלה אחת (6 מספרים + מספר חזק)'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order_id = int(request.data.get('order_id') or 0)
    except (TypeError, ValueError):
        order_id = 0

    payload = build_forms_payload_for_user(
        request.user,
        order_id=order_id,
        tables=tables,
    )
    try:
        result = send_print_payload(payload)
    except PrintError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        'detail': print_success_detail(tables_count=len(tables), result=result),
        'tables_count': len(tables),
        'printer_confirmed': bool(
            isinstance(result, dict) and (result.get('printed') or result.get('success'))
        ),
        'print_response': result,
    })
