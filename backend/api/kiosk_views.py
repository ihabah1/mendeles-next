"""Kiosk booth auth and staff admin CRUD."""
import base64
import json
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from admin_panel.accounts.models import User
from admin_panel.portal.models import IntegrationLog, Kiosk, Order, PrintJob
from api.services.integration_log import log_integration
from api.services.print_auth import authenticate_print_client, print_api_key_header
from api.services.print_queue_service import complete_job_for_order, queue_counts
from api.staff_permissions import IsStaffPortalUser

IsStaffUser = IsStaffPortalUser


def _kiosk_to_dict(kiosk: Kiosk, *, include_api_key: bool = False) -> dict:
    hint = None
    if kiosk.api_key and len(kiosk.api_key) >= 4:
        hint = f"…{kiosk.api_key[-4:]}"
    data = {
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
    if include_api_key and kiosk.api_key:
        data['apiKey'] = kiosk.api_key
    return data


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
            'kiosks': [_kiosk_to_dict(k, include_api_key=True) for k in kiosks],
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

    return Response({
        'kiosk': _kiosk_to_dict(kiosk, include_api_key=True),
        'detail': 'דוכן נוצר בהצלחה.',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsStaffUser])
def admin_kiosk_detail(request, kiosk_id: int):
    try:
        kiosk = Kiosk.objects.get(pk=kiosk_id)
    except Kiosk.DoesNotExist:
        return Response({'detail': 'דוכן לא נמצא.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'kiosk': _kiosk_to_dict(kiosk, include_api_key=True)})

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
        'kiosk': _kiosk_to_dict(kiosk, include_api_key=True),
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
        'kiosk': _kiosk_to_dict(kiosk, include_api_key=True),
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


def _require_kiosk_client(request):
    ok, kiosk = authenticate_print_client(request)
    if not ok:
        return None, Response(
            {
                'error': 'אין הרשאה',
                'detail': f'נדרש {print_api_key_header()} תקין (apiKey מהתחברות דוכן)',
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return kiosk, None


def _sets_json_for_kiosk(sets_json: list) -> str:
    sets = []
    for s in sorted(sets_json or [], key=lambda x: x.get('set_index', 0)):
        nums = s.get('nums') or s.get('numbers') or []
        if not nums:
            nums = [s.get(f'n{i}') for i in range(1, 7) if s.get(f'n{i}') is not None]
        sets.append({
            'nums': nums,
            'numbers': nums,
            'strong': s.get('strong'),
            'set_index': s.get('set_index'),
        })
    return json.dumps(sets, ensure_ascii=False)


def _job_for_kiosk(job: PrintJob) -> dict:
    order = job.order
    customer = order.customer
    return {
        'id': job.id,
        'jobId': job.id,
        'orderId': order.id,
        'orderNumber': order.order_number,
        'userName': customer.display_name if customer else '',
        'userPhone': getattr(customer, 'phone', '') or '',
        'status': job.status,
        'setsJson': _sets_json_for_kiosk(order.sets_json),
        'tablesCount': order.forms_count,
        'totalIls': float(order.amount_ils),
        'drawName': order.draw_name or '',
        'createdAt': job.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def kiosk_jobs(request):
    """GET /api/kiosk/jobs/?status=pending|printed — booth software job list."""
    _kiosk, denied = _require_kiosk_client(request)
    if denied:
        return denied

    status_filter = (request.query_params.get('status') or 'pending').strip().lower()
    qs = (
        PrintJob.objects.select_related('order', 'order__customer')
        .exclude(order__status=Order.Status.COMPLETED)
        .exclude(order__status=Order.Status.CANCELLED)
    )

    if status_filter == 'pending':
        qs = qs.filter(
            status__in=[
                PrintJob.Status.QUEUED,
                PrintJob.Status.APPROVED,
                PrintJob.Status.CLAIMED,
                PrintJob.Status.PRINTING,
            ],
        )
    elif status_filter in ('printed', 'awaiting_scan'):
        qs = qs.filter(status=PrintJob.Status.PRINTED).filter(
            Q(order__scan_pdf__isnull=True) | Q(order__scan_pdf=b''),
        )
    else:
        return Response({'error': 'סטטוס לא תקין', 'detail': 'סטטוס לא תקין'}, status=status.HTTP_400_BAD_REQUEST)

    jobs = [_job_for_kiosk(j) for j in qs.order_by('-priority', 'created_at')[:50]]
    return Response({'jobs': jobs, 'count': len(jobs)})


@api_view(['GET'])
@permission_classes([AllowAny])
def kiosk_dashboard(request):
    """GET /api/kiosk/dashboard/ — booth stats."""
    kiosk, denied = _require_kiosk_client(request)
    if denied:
        return denied

    counts = queue_counts()
    pending = (
        counts.get(PrintJob.Status.QUEUED, 0)
        + counts.get(PrintJob.Status.APPROVED, 0)
        + counts.get(PrintJob.Status.CLAIMED, 0)
        + counts.get(PrintJob.Status.PRINTING, 0)
    )
    today = timezone.localdate()
    completed_today = Order.objects.filter(
        status=Order.Status.COMPLETED,
        scanned_at__date=today,
    ).count()

    return Response({
        'name': kiosk.name if kiosk else '',
        'pending': pending,
        'awaitingScan': counts.get('awaiting_scan', 0),
        'failed': counts.get(PrintJob.Status.FAILED, 0),
        'completedToday': completed_today,
        'pricePerTable': float(kiosk.price_per_table) if kiosk else None,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def kiosk_complete(request):
    """POST /api/kiosk/complete/ — booth after print+scan (base64 PDF)."""
    _kiosk, denied = _require_kiosk_client(request)
    if denied:
        return denied

    job_id = request.data.get('jobId') or request.data.get('job_id')
    scan_b64 = request.data.get('scanPdf') or request.data.get('scan_pdf') or request.data.get('file')
    if not job_id:
        return Response({'error': 'jobId חסר', 'detail': 'jobId חסר'}, status=status.HTTP_400_BAD_REQUEST)
    if not scan_b64:
        return Response({'error': 'scanPdf חסר', 'detail': 'scanPdf חסר'}, status=status.HTTP_400_BAD_REQUEST)

    job = PrintJob.objects.select_related('order').filter(pk=job_id).first()
    if not job:
        return Response({'error': 'משימה לא נמצאה', 'detail': 'משימה לא נמצאה'}, status=status.HTTP_404_NOT_FOUND)

    order = job.order
    try:
        pdf_bytes = base64.b64decode(scan_b64)
    except (TypeError, ValueError):
        return Response({'error': 'קובץ לא תקין', 'detail': 'קובץ לא תקין'}, status=status.HTTP_400_BAD_REQUEST)
    if not pdf_bytes:
        return Response({'error': 'קובץ ריק', 'detail': 'קובץ ריק'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if not order.printed_at:
        order.printed_at = now
    order.scan_pdf = pdf_bytes
    order.scanned_at = now
    order.status = Order.Status.COMPLETED
    order.save(update_fields=['scan_pdf', 'scanned_at', 'printed_at', 'status'])

    job.status = PrintJob.Status.PRINTED
    job.completed_at = now
    job.last_error = ''
    job.save(update_fields=['status', 'completed_at', 'last_error', 'updated_at'])
    complete_job_for_order(order)

    log_integration(
        IntegrationLog.Source.PRINT,
        IntegrationLog.Level.INFO,
        f'הושלם מדוכן: {order.order_number}',
        order=order,
        details={'bytes': len(pdf_bytes), 'kiosk': _kiosk.name if _kiosk else None},
    )
    return Response({
        'status': 'ok',
        'jobId': job.id,
        'orderId': order.id,
        'orderNumber': order.order_number,
        'completed': True,
    })
