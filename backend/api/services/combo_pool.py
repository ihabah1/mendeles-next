"""Approved combo pool — load from approved_combos.json, unique per customer forever."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from admin_panel.portal.models import ApprovedCombo, LottoSet

logger = logging.getLogger(__name__)

BATCH_SIZE = 5000
STATE_FILE = 'combo_pool_state.json'
META_FILE = 'approved_combos_meta.json'


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


def _meta_path() -> Path:
    path = Path(settings.BASE_DIR) / 'data' / META_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def read_json_meta() -> dict:
    path = _meta_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}


def write_json_meta(meta: dict) -> None:
    path = _meta_path()
    path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')


def count_json_objects(path: Path) -> int:
    """Raw array length in approved_combos.json (not deduped)."""
    raw = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(raw, list):
        raise ValueError('approved_combos.json חייב להיות מערך')
    return len(raw)


def approved_combos_json_stats() -> dict:
    """
    File-level stats for monitoring — caches object count; recounts only when mtime changes.
    """
    path = find_approved_combos_json()
    if not path:
        return {
            'exists': False,
            'path': None,
            'objectCount': None,
            'sizeMb': None,
            'updatedAt': None,
            'addedRecently': None,
            'pendingImport': False,
            'lastImportedAt': read_pool_state().get('lastRefreshedAt'),
            'lastImportedCount': read_pool_state().get('totalImported'),
        }

    try:
        stat = path.stat()
    except OSError:
        return {
            'exists': False,
            'path': str(path),
            'objectCount': None,
            'sizeMb': None,
            'updatedAt': None,
            'addedRecently': None,
            'pendingImport': False,
            'lastImportedAt': read_pool_state().get('lastRefreshedAt'),
            'lastImportedCount': read_pool_state().get('totalImported'),
        }

    mtime = stat.st_mtime
    size_mb = round(stat.st_size / (1024 * 1024), 2)
    updated_at = datetime.fromtimestamp(mtime, tz=timezone.get_current_timezone()).isoformat()
    meta = read_json_meta()
    state = read_pool_state()

    if meta.get('mtime') != mtime or meta.get('objectCount') is None:
        try:
            count = count_json_objects(path)
            prev = meta.get('objectCount')
            if prev is None:
                prev = state.get('jsonObjectCount') or 0
            added = max(0, count - int(prev)) if prev else 0
            meta = {
                'path': str(path),
                'mtime': mtime,
                'objectCount': count,
                'previousObjectCount': prev,
                'addedRecently': added,
                'countedAt': timezone.now().isoformat(),
            }
            write_json_meta(meta)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            logger.warning('Failed counting approved_combos.json: %s', exc)
            count = meta.get('objectCount')
            added = meta.get('addedRecently')
    else:
        count = meta.get('objectCount')
        added = meta.get('addedRecently', 0)

    pool_mtime = state.get('jsonModifiedAt')
    pending_import = bool(count and (pool_mtime is None or abs(float(pool_mtime) - float(mtime)) > 0.001))

    return {
        'exists': True,
        'path': str(path),
        'objectCount': count,
        'sizeMb': size_mb,
        'updatedAt': updated_at,
        'addedRecently': added if added is not None else 0,
        'pendingImport': pending_import,
        'lastImportedAt': state.get('lastRefreshedAt'),
        'lastImportedCount': state.get('totalImported'),
        'addedSinceLastImport': state.get('addedSinceLastRefresh'),
    }


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
    prev_state = read_pool_state()
    prev_imported = int(prev_state.get('totalImported') or prev_state.get('jsonObjectCount') or 0)

    source_path = json_path or find_approved_combos_json()
    json_mtime = None
    json_raw_count = None
    if source_path and source_path.is_file():
        try:
            stat = source_path.stat()
            json_mtime = stat.st_mtime
            json_raw_count = count_json_objects(source_path)
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            logger.warning('Could not read JSON file stats: %s', exc)

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
    added_since_refresh = max(0, (json_raw_count or imported) - prev_imported) if prev_imported else 0
    state = {
        'lastLotteryId': lottery_id,
        'lastRefreshedAt': timezone.now().isoformat(),
        'sourceFile': str(source_path or find_approved_combos_json()),
        'totalImported': imported,
        'preMarkedUsed': pre_used,
        'free': free,
        'jsonObjectCount': json_raw_count or imported,
        'jsonModifiedAt': json_mtime,
        'previousJsonObjectCount': prev_imported,
        'addedSinceLastRefresh': added_since_refresh,
    }
    write_pool_state(state)
    if json_mtime is not None and json_raw_count is not None:
        write_json_meta({
            'path': str(source_path),
            'mtime': json_mtime,
            'objectCount': json_raw_count,
            'previousObjectCount': prev_imported,
            'addedRecently': added_since_refresh,
            'countedAt': timezone.now().isoformat(),
        })
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
    json_stats = approved_combos_json_stats()
    return {
        'total': total,
        'used': used,
        'free': free,
        'percentUsed': round(100 * used / total, 1) if total else 0,
        'jsonPath': json_stats.get('path'),
        'jsonExists': json_stats.get('exists', False),
        'state': state,
        'historyCount': len(historically_distributed_keys()),
        'json': json_stats,
    }
