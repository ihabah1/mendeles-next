"""Daily automation — PAIS draw refresh + combo pool snapshot."""
import csv
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from admin_panel.portal.models import ApprovedCombo, AutomationLog

from api.services.automation_log import log_automation
from api.services.pais_draw import draw_results_path, fetch_and_save_draw


class Command(BaseCommand):
    help = 'Daily sync: fetch PAIS draw, export combo stats CSV, log results'

    def handle(self, *args, **options):
        started = time.monotonic()
        details: dict = {}
        try:
            draw = fetch_and_save_draw()
            details['draw'] = draw.get('last_draw') if draw else None
            log_automation(
                AutomationLog.Job.DRAW_REFRESH,
                f"הגרלה {details.get('draw', {}).get('lottery_id', '?')} עודכנה מפיס",
                details=details.get('draw') or {},
            )

            total = ApprovedCombo.objects.count()
            used = ApprovedCombo.objects.filter(used=True).count()
            free = ApprovedCombo.objects.filter(used=False).count()
            details['combos'] = {'total': total, 'used': used, 'free': free}

            csv_path = self._export_combo_stats(total, used, free)
            details['csvPath'] = str(csv_path) if csv_path else None

            duration_ms = int((time.monotonic() - started) * 1000)
            log_automation(
                AutomationLog.Job.DAILY_SYNC,
                'סנכרון יומי הושלם בהצלחה',
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
