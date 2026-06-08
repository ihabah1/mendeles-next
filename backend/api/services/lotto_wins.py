"""Check lotto orders against a draw and credit customer wallets."""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from admin_panel.portal.models import ActionLog, Order

from api.services.user_setup import ensure_customer_records

RANK_KEYS = ['6+strong', '6', '5+strong', '5', '4+strong', '4', '3+strong', '3']

ACTIVE_STATUSES = (
    Order.Status.PAID,
    Order.Status.PRINTING,
    Order.Status.PRINTED,
    Order.Status.SHIPPED,
    Order.Status.COMPLETED,
)


def calc_rank(nums: list[int], strong: int, draw_nums: list[int], draw_strong: int) -> str | None:
    hits = sum(1 for n in nums if n in draw_nums)
    strong_hit = strong == draw_strong
    if hits == 6 and strong_hit:
        return '6+strong'
    if hits == 6:
        return '6'
    if hits == 5 and strong_hit:
        return '5+strong'
    if hits == 5:
        return '5'
    if hits == 4 and strong_hit:
        return '4+strong'
    if hits == 4:
        return '4'
    if hits == 3 and strong_hit:
        return '3+strong'
    if hits == 3:
        return '3'
    return None


def _normalize_nums(row: dict) -> list[int] | None:
    nums = row.get('nums')
    if isinstance(nums, list) and len(nums) == 6:
        return [int(n) for n in nums]
    keys = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']
    if all(row.get(k) is not None for k in keys):
        return [int(row[k]) for k in keys]
    return None


def _credit_event_key(lottery_id: int, order_id: int, set_index: int) -> str:
    return f'wallet.win_credit:{lottery_id}:{order_id}:{set_index}'


def _already_credited(lottery_id: int, order_id: int, set_index: int) -> bool:
    key = _credit_event_key(lottery_id, order_id, set_index)
    return ActionLog.objects.filter(event=key).exists()


@transaction.atomic
def check_and_credit_wins(draw_data: dict, *, dry_run: bool = False) -> dict:
    """
    Compare paid orders' sets against draw_data and credit prize ILS per winning set.
    Idempotent per lottery_id + order + set_index via ActionLog event keys.
    """
    draw = draw_data.get('last_draw') or {}
    prizes = draw_data.get('prizes') or {}
    lottery_id = draw.get('lottery_id')
    draw_nums = draw.get('numbers') or []
    draw_strong = draw.get('strong')
    draw_date = draw.get('date')

    if not lottery_id or len(draw_nums) != 6 or not draw_strong:
        raise ValueError('נתוני הגרלה לא שלמים')

    orders = (
        Order.objects.filter(status__in=ACTIVE_STATUSES)
        .exclude(sets_json=[])
        .select_related('customer')
        .order_by('id')
    )

    wins: list[dict] = []
    credited_count = 0
    skipped_count = 0
    total_prize = Decimal('0')

    for order in orders:
        for row in order.sets_json or []:
            nums = _normalize_nums(row)
            strong = int(row.get('strong') or 0)
            set_index = int(row.get('set_index') or 0)
            if not nums or not strong or not set_index:
                continue

            rank = calc_rank(nums, strong, draw_nums, draw_strong)
            if not rank:
                continue

            prize_ils = Decimal(str((prizes.get(rank) or {}).get('ils') or 0))
            if prize_ils <= 0:
                continue

            entry = {
                'order_id': order.id,
                'order_number': order.order_number,
                'customer_email': order.customer.email,
                'set_index': set_index,
                'rank': rank,
                'prize_ils': float(prize_ils),
            }

            if _already_credited(lottery_id, order.id, set_index):
                entry['status'] = 'already_credited'
                skipped_count += 1
                wins.append(entry)
                continue

            if dry_run:
                entry['status'] = 'would_credit'
                wins.append(entry)
                total_prize += prize_ils
                credited_count += 1
                continue

            _, credit = ensure_customer_records(order.customer)
            credit.balance_ils += prize_ils
            credit.save(update_fields=['balance_ils', 'updated_at'])

            event = _credit_event_key(lottery_id, order.id, set_index)
            ActionLog.objects.create(
                customer=order.customer,
                performed_by=order.customer,
                event=event,
                details=(
                    f'rank:{rank} prize:{prize_ils} order:{order.order_number} '
                    f'set:{set_index} lottery:{lottery_id} draw:{draw_date}'
                ),
            )
            entry['status'] = 'credited'
            entry['new_balance'] = float(credit.balance_ils)
            wins.append(entry)
            total_prize += prize_ils
            credited_count += 1

    return {
        'lottery_id': lottery_id,
        'draw_date': draw_date,
        'dry_run': dry_run,
        'wins': len(wins),
        'credited': credited_count,
        'skipped_already': skipped_count,
        'total_prize_ils': float(total_prize),
        'checked_at': timezone.now().isoformat(),
        'details': wins,
    }
