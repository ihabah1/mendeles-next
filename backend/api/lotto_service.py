"""Lotto business logic — order numbers, set generation, combo pool."""
import json
import os
import random
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from admin_panel.portal.models import ApprovedCombo, LottoSet

TABLE_PRICE = Decimal(os.getenv('TABLE_PRICE_ILS', '2.5'))
COMMISSION = Decimal(os.getenv('COMMISSION_ILS', '5.0'))


def gen_order_number() -> str:
    ts = str(int(timezone.now().timestamp() * 1000))[-5:]
    rnd = random.randint(100, 999)
    return f'MAND-{ts}{rnd}'


def generate_mandel_sets(count: int = 200) -> list[dict]:
    """Fallback random sets when the approved-combo pool is empty."""
    sets = []
    for i in range(count):
        pool = list(range(1, 38))
        random.shuffle(pool)
        nums = sorted(pool[:6])
        sets.append({
            'set_index': i + 1,
            'n1': nums[0], 'n2': nums[1], 'n3': nums[2],
            'n4': nums[3], 'n5': nums[4], 'n6': nums[5],
            'strong': (i % 7) + 1,
        })
    return sets


def _combo_to_set(combo: ApprovedCombo, index: int) -> dict:
    nums = [combo.n1, combo.n2, combo.n3, combo.n4, combo.n5, combo.n6]
    strong = (index % 7) + 1
    return {
        'set_index': index,
        'n1': combo.n1, 'n2': combo.n2, 'n3': combo.n3,
        'n4': combo.n4, 'n5': combo.n5, 'n6': combo.n6,
        'strong': strong,
        'display': f'{" ".join(map(str, nums))} | 💪{strong}',
    }


@transaction.atomic
def get_unique_sets_for_user(user, count: int = 200) -> list[dict]:
    """Claim unused combos from the pool for a customer."""
    combos = list(
        ApprovedCombo.objects.filter(used=False).order_by('?')[:count]
    )
    if not combos:
        return generate_mandel_sets(count)

    now = timezone.now()
    result = []
    for i, combo in enumerate(combos, start=1):
        combo.used = True
        combo.used_by = user
        combo.used_at = now
        combo.save(update_fields=['used', 'used_by', 'used_at'])
        result.append(_combo_to_set(combo, i))
    return result


def lotto_set_to_api(row: LottoSet) -> dict:
    nums = [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6]
    return {
        'set_index': row.set_index,
        'n1': row.n1, 'n2': row.n2, 'n3': row.n3,
        'n4': row.n4, 'n5': row.n5, 'n6': row.n6,
        'strong': row.strong,
        'draw_date': row.draw_date,
        'display': f'{" ".join(map(str, nums))} | 💪{row.strong}',
    }


def read_last_lottery_id() -> int | None:
    """Read the latest lottery id from draw_results.json if present."""
    for candidate in (
        Path(settings.BASE_DIR) / 'draw_results.json',
        Path(settings.BASE_DIR).parent / 'draw_results.json',
    ):
        if not candidate.exists():
            continue
        try:
            data = json.loads(candidate.read_text(encoding='utf-8'))
            return data.get('last_draw', {}).get('lottery_id')
        except (json.JSONDecodeError, OSError):
            continue
    return None
