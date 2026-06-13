"""Approved combo pool — load from approved_combos.json, unique per customer forever."""
from __future__ import annotations

import json
import logging
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from admin_panel.portal.models import ApprovedCombo, LottoSet

logger = logging.getLogger(__name__)

BATCH_SIZE = 5000
STATE_FILE = 'combo_pool_state.json'


def combo_key(n1: int, n2: int, n3: int, n4: int, n5: int, n6: int) -> tuple[int, ...]:
    return tuple(sorted((n1, n2, n3, n4, n5, n6)))


def find_approved_combos_json() -> Path | None:
    base = Path(settings.BASE_DIR)
    for candidate in (
        base / 'approved_combos.json',
        base.parent / 'approved_combos.json',
        base / 'data' / 'approved_combos.json',
    ):
        if candidate.is_file():
            return candidate
    return None


def _state_path() -> Path:
    path = Path(settings.BASE_DIR) / 'data' / STATE_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def read_pool_state() -> dict:
    path = _state_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}


def write_pool_state(state: dict) -> None:
    path = _state_path()
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')


def historically_distributed_keys() -> set[tuple[int, ...]]:
    """All 6-number combos ever assigned to any customer (LottoSet history)."""
    keys: set[tuple[int, ...]] = set()
    for row in LottoSet.objects.values_list('n1', 'n2', 'n3', 'n4', 'n5', 'n6').iterator(chunk_size=5000):
        keys.add(combo_key(*row))
    return keys


def _normalize_raw_combo(raw) -> tuple[int, ...] | None:
    if not isinstance(raw, (list, tuple)) or len(raw) != 6:
        return None
    try:
        nums = [int(x) for x in raw]
    except (TypeError, ValueError):
        return None
    if not all(1 <= n <= 37 for n in nums):
        return None
    if len(set(nums)) != 6:
        return None
    return combo_key(*nums)


def load_combos_from_json(path: Path | None = None) -> list[tuple[int, ...]]:
    json_path = path or find_approved_combos_json()
    if not json_path:
        raise FileNotFoundError('approved_combos.json לא נמצא בשרת')

    logger.info('Loading combos from %s', json_path)
    raw = json.loads(json_path.read_text(encoding='utf-8'))
    if not isinstance(raw, list):
        raise ValueError('approved_combos.json חייב להיות מערך')

    seen: set[tuple[int, ...]] = set()
    combos: list[tuple[int, ...]] = []
    for item in raw:
        key = _normalize_raw_combo(item)
        if key and key not in seen:
            seen.add(key)
            combos.append(key)
    return combos


@transaction.atomic
def reload_combo_pool_from_json(
    *,
    lottery_id: int | None = None,
    json_path: Path | None = None,
) -> dict:
    """
    Full pool refresh (per draw):
    1. Load combos from approved_combos.json
    2. Replace DB pool
    3. Mark combos already given in the past as used (never re-issue)
    """
    combos = load_combos_from_json(json_path)
    history = historically_distributed_keys()

    ApprovedCombo.objects.all().delete()

    imported = 0
    pre_used = 0
    for i in range(0, len(combos), BATCH_SIZE):
        batch = combos[i:i + BATCH_SIZE]
        rows = []
        for key in batch:
            n1, n2, n3, n4, n5, n6 = key
            already = key in history
            if already:
                pre_used += 1
            rows.append(
                ApprovedCombo(
                    n1=n1, n2=n2, n3=n3, n4=n4, n5=n5, n6=n6,
                    used=already,
                    used_at=timezone.now() if already else None,
                )
            )
        ApprovedCombo.objects.bulk_create(rows, batch_size=BATCH_SIZE)
        imported += len(rows)

    free = imported - pre_used
    state = {
        'lastLotteryId': lottery_id,
        'lastRefreshedAt': timezone.now().isoformat(),
        'sourceFile': str(json_path or find_approved_combos_json()),
        'totalImported': imported,
        'preMarkedUsed': pre_used,
        'free': free,
    }
    write_pool_state(state)
    return state


def refresh_combo_pool_for_draw(lottery_id: int | None, *, force: bool = False) -> dict | None:
    """
    Reload pool when lottery advances (or force=True).
    Returns stats dict, or None if skipped.
    """
    if lottery_id is None:
        return None

    prev = read_pool_state()
    prev_id = prev.get('lastLotteryId')
    if not force and prev_id is not None and int(prev_id) >= int(lottery_id):
        logger.info('Combo pool skip — already refreshed for lottery %s', lottery_id)
        return {
            'skipped': True,
            'reason': 'already_refreshed',
            'lastLotteryId': prev_id,
        }

    if not find_approved_combos_json():
        logger.warning('approved_combos.json missing — cannot refresh pool')
        return {
            'skipped': True,
            'reason': 'json_missing',
            'lastLotteryId': prev_id,
        }

    stats = reload_combo_pool_from_json(lottery_id=lottery_id)
    stats['skipped'] = False
    return stats


@transaction.atomic
def claim_unique_combos_for_user(user, count: int = 200) -> list[dict]:
    """
    Assign unused combos from pool. Never returns a combo that was
    distributed before (DB used flag + LottoSet history check).
    """
    history = historically_distributed_keys()
    claimed: list[dict] = []
    attempts = 0
    max_attempts = max(count * 3, 50)

    while len(claimed) < count and attempts < max_attempts:
        need = count - len(claimed)
        batch_size = min(need * 2, 100)
        candidates = list(
            ApprovedCombo.objects.filter(used=False)
            .select_for_update(skip_locked=True)
            .order_by('?')[:batch_size]
        )
        if not candidates:
            break

        now = timezone.now()
        for combo in candidates:
            if len(claimed) >= count:
                break
            key = combo_key(combo.n1, combo.n2, combo.n3, combo.n4, combo.n5, combo.n6)
            if key in history:
                combo.used = True
                combo.used_at = now
                combo.save(update_fields=['used', 'used_at'])
                continue

            combo.used = True
            combo.used_by = user
            combo.used_at = now
            combo.save(update_fields=['used', 'used_by', 'used_at'])
            history.add(key)
            idx = len(claimed) + 1
            nums = list(key)
            strong = (idx % 7) + 1
            claimed.append({
                'set_index': idx,
                'n1': nums[0], 'n2': nums[1], 'n3': nums[2],
                'n4': nums[3], 'n5': nums[4], 'n6': nums[5],
                'strong': strong,
                'display': f'{" ".join(map(str, nums))} | 💪{strong}',
            })
        attempts += 1

    return claimed


def is_combo_available(nums: list[int]) -> bool:
    """Check if a 6-number combo was never distributed to any customer."""
    if len(nums) != 6:
        return False
    key = combo_key(*nums)
    if key in historically_distributed_keys():
        return False
    return ApprovedCombo.objects.filter(
        n1=key[0], n2=key[1], n3=key[2], n4=key[3], n5=key[4], n6=key[5],
        used=False,
    ).exists()


def pool_stats() -> dict:
    total = ApprovedCombo.objects.count()
    used = ApprovedCombo.objects.filter(used=True).count()
    free = ApprovedCombo.objects.filter(used=False).count()
    state = read_pool_state()
    json_path = find_approved_combos_json()
    return {
        'total': total,
        'used': used,
        'free': free,
        'percentUsed': round(100 * used / total, 1) if total else 0,
        'jsonPath': str(json_path) if json_path else None,
        'jsonExists': bool(json_path),
        'state': state,
        'historyCount': len(historically_distributed_keys()),
    }
