"""Public lotto stats from Django orders + draw_results.json."""
from __future__ import annotations

from admin_panel.portal.models import Order

from api.services.lotto_wins import ACTIVE_STATUSES, calc_rank, _normalize_nums
from api.services.pais_draw import RANK_KEYS


def compute_draw_win_stats(draw_data: dict | None) -> dict:
    """Win counts and prize totals for the published draw (real DB orders)."""
    empty = {
        'total_orders': Order.objects.filter(status__in=ACTIVE_STATUSES).count(),
        'win_stats': {k: 0 for k in RANK_KEYS},
        'total_winners': 0,
        'total_prize': 0,
    }
    if not draw_data:
        return empty

    draw = draw_data.get('last_draw') or {}
    prizes = draw_data.get('prizes') or {}
    lottery_id = draw.get('lottery_id')
    draw_nums = draw.get('numbers') or []
    draw_strong = draw.get('strong')

    if not lottery_id or len(draw_nums) != 6 or not draw_strong:
        return empty

    orders = (
        Order.objects.filter(status__in=ACTIVE_STATUSES, lottery_id=lottery_id)
        .exclude(sets_json=[])
    )
    win_stats = {k: 0 for k in RANK_KEYS}

    for order in orders:
        for row in order.sets_json or []:
            nums = _normalize_nums(row)
            strong = int(row.get('strong') or 0)
            if not nums or not strong:
                continue
            rank = calc_rank(nums, strong, draw_nums, draw_strong)
            if rank:
                win_stats[rank] = win_stats.get(rank, 0) + 1

    total_winners = sum(win_stats.values())
    total_prize = sum(
        win_stats[r] * int((prizes.get(r) or {}).get('ils') or 0)
        for r in RANK_KEYS
        if win_stats.get(r)
    )

    return {
        'total_orders': orders.count(),
        'win_stats': win_stats,
        'total_winners': total_winners,
        'total_prize': total_prize,
        'lottery_id': lottery_id,
    }
