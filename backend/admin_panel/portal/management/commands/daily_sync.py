"""Daily automation — PAIS draw refresh + combo pool snapshot."""
import csv
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from admin_panel.portal.models import AutomationLog

from api.services.automation_log import log_automation
from api.services.combo_pool import pool_stats, refresh_combo_pool_for_draw
from api.services.pais_draw import draw_results_path, load_draw_for_sync


class Command(BaseCommand):
    help = 'Daily sync: fetch PAIS draw, export combo stats CSV, log results'

    def handle(self, *args, **options):
        started = time.monotonic()
        details: dict = {}
        try:
            draw, draw_warning = load_draw_for_sync()
            details['draw'] = draw.get('last_draw') if draw else None
            if draw_warning:
                details['drawFetchWarning'] = draw_warning
            lottery_id = (details.get('draw') or {}).get('lottery_id')
            draw_msg = f"הגרלה {lottery_id or '?'}"
            if draw_warning:
                draw_msg += ' (מטמון)'
            else:
                draw_msg += ' עודכנה מפיס'
            log_automation(
                AutomationLog.Job.DRAW_REFRESH,
                draw_msg,
                details=details.get('draw') or {},
            )

            if draw:
                from api.services.lotto_wins import check_and_credit_wins

                try:
                    win_result = check_and_credit_wins(draw, dry_run=False)
                    details['winCredit'] = {
                        'credited': win_result.get('credited'),
                        'total_prize_ils': win_result.get('total_prize_ils'),
                        'wins': win_result.get('wins'),
                    }
                    log_automation(
                        AutomationLog.Job.DAILY_SYNC,
                        f"זכיות: {win_result.get('credited', 0)} טבלאות · ₪{win_result.get('total_prize_ils', 0)}",
                        details=details['winCredit'],
                    )
                except ValueError as exc:
                    details['winCredit'] = {'error': str(exc)}

            pool_refresh = refresh_combo_pool_for_draw(lottery_id)
            details['poolRefresh'] = pool_refresh
            if pool_refresh and not pool_refresh.get('skipped'):
                log_automation(
                    AutomationLog.Job.COMBO_EXPORT,
                    f"מאגר צירופים רוענן — {pool_refresh.get('free', 0)} פנויים",
                    details=pool_refresh,
                )

            stats = pool_stats()
            details['combos'] = {
                'total': stats['total'],
                'used': stats['used'],
                'free': stats['free'],
                'historyCount': stats['historyCount'],
            }
            json_info = stats.get('json') or {}
            details['combosJson'] = {
                'objectCount': json_info.get('objectCount'),
                'updatedAt': json_info.get('updatedAt'),
                'addedRecently': json_info.get('addedRecently'),
                'pendingImport': json_info.get('pendingImport'),
            }

            csv_path = self._export_combo_stats(
                stats['total'], stats['used'], stats['free'],
            )
            details['csvPath'] = str(csv_path) if csv_path else None

            duration_ms = int((time.monotonic() - started) * 1000)
            success_msg = 'סנכרון יומי הושלם בהצלחה'
            if details.get('drawFetchWarning'):
                success_msg += ' (מטמון הגרלה)'
            log_automation(
                AutomationLog.Job.DAILY_SYNC,
                success_msg,
                details=details,
                duration_ms=duration_ms,
            )
            self.stdout.write(self.style.SUCCESS(f'daily_sync OK ({duration_ms}ms)'))
        except Exception as exc:
            duration_ms = int((time.monotonic() - started) * 1000)
            log_automation(
                AutomationLog.Job.DAILY_SYNC,
                f'סנכרון יומי נכשל: {exc}',
                level=AutomationLog.Level.ERROR,
                details={'error': str(exc)},
                duration_ms=duration_ms,
            )
            self.stderr.write(self.style.ERROR(str(exc)))
            raise

    def _export_combo_stats(self, total: int, used: int, free: int) -> Path | None:
        """Write daily stats row — not full 37MB combo dump."""
        out_dir = Path(settings.BASE_DIR) / 'data'
        out_dir.mkdir(parents=True, exist_ok=True)
        csv_path = out_dir / 'combo_pool_daily.csv'
        row = {
            'date': timezone.localdate().isoformat(),
            'total': total,
            'used': used,
            'free': free,
            'draw_file': str(draw_results_path()),
        }
        write_header = not csv_path.exists()
        with csv_path.open('a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=list(row.keys()))
            if write_header:
                writer.writeheader()
            writer.writerow(row)
        log_automation(
            AutomationLog.Job.COMBO_EXPORT,
            f'סטטיסטיקת מאגר: {free} פנויים מתוך {total}',
            details=row,
        )
        return csv_path
