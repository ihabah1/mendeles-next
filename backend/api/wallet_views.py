"""Wallet endpoints consumed by the React frontend (balance / history / topup)."""
import os
from decimal import Decimal

from django.db.models import Sum
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from admin_panel.portal.models import ActionLog, Order

from .services.user_setup import ensure_customer_records


def _client_ip(request) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _log_wallet_action(request, event: str, details: str = '') -> None:
    ActionLog.objects.create(
        customer=request.user,
        performed_by=request.user,
        event=event,
        details=details,
        ip_address=_client_ip(request),
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def wallet_balance(request):
    """GET /api/wallet/balance/ -> { balance, currency }."""
    _, credit = ensure_customer_records(request.user)
    return Response({
        'balance': float(credit.balance_ils),
        'currency': 'ILS',
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def wallet_history(request):
    """GET /api/wallet/history/ -> { transactions: [...] }."""
    logs = (
        ActionLog.objects.filter(customer=request.user)
        .filter(event__startswith='wallet.')
        .order_by('-created_at')[:50]
    )
    transactions = []
    for log in logs:
        amount = Decimal('0')
        if log.details.startswith('amount:'):
            try:
                amount = Decimal(log.details.split(':', 1)[1].split()[0])
            except (IndexError, ValueError):
                pass
        transactions.append({
            'id': log.id,
            'type': log.event.replace('wallet.', ''),
            'amountIls': float(amount),
            'description': log.event.replace('wallet.', '').replace('_', ' '),
            'createdAt': log.created_at.isoformat(),
        })
    return Response({'transactions': transactions})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def wallet_topup(request):
    """POST /api/wallet/topup/ { amount_ils } -> Stripe PaymentIntent or dev credit."""
    try:
        amount_ils = Decimal(str(request.data.get('amount_ils', '')))
    except Exception:
        return Response({'error': 'סכום לא תקין (10-5000)'}, status=status.HTTP_400_BAD_REQUEST)

    if amount_ils < 10 or amount_ils > 5000:
        return Response({'error': 'סכום לא תקין (10-5000)'}, status=status.HTTP_400_BAD_REQUEST)

    stripe_key = os.getenv('STRIPE_SECRET_KEY', '').strip()
    if stripe_key:
        try:
            import stripe  # noqa: WPS433 — optional runtime dependency
        except ImportError:
            return Response(
                {'error': 'Stripe לא מותקן בשרת (pip install stripe)'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        stripe.api_key = stripe_key
        intent = stripe.PaymentIntent.create(
            amount=int(amount_ils * 100),
            currency='ils',
            metadata={
                'user_id': str(request.user.id),
                'type': 'wallet_topup',
                'amount_ils': str(amount_ils),
            },
        )
        _log_wallet_action(
            request,
            'wallet.topup_intent',
            f'amount:{amount_ils} payment:{intent.id}',
        )
        return Response({
            'client_secret': intent.client_secret,
            'payment_id': intent.id,
            'amount_ils': float(amount_ils),
        })

    # Dev / no-Stripe: credit the wallet immediately.
    _, credit = ensure_customer_records(request.user)
    credit.balance_ils += amount_ils
    credit.total_topup_ils += amount_ils
    credit.save(update_fields=['balance_ils', 'total_topup_ils', 'updated_at'])
    _log_wallet_action(request, 'wallet.topup', f'amount:{amount_ils}')
    return Response({
        'payment_id': f'dev-{request.user.id}-{credit.updated_at.timestamp():.0f}',
        'amount_ils': float(amount_ils),
        'balance': float(credit.balance_ils),
        'dev_mode': True,
    })
