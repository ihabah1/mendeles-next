"""Reload approved_combos.json into PostgreSQL pool."""
from django.core.management.base import BaseCommand

from api.services.combo_pool import pool_stats, read_pool_state, reload_combo_pool_from_json
from api.services.pais_draw import read_draw_data


class Command(BaseCommand):
    help = 'Import approved_combos.json into DB — marks historically distributed combos as used'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Reload even if pool was already refreshed for current lottery',
        )
        parser.add_argument(
            '--json',
            type=str,
            default='',
            help='Path to approved_combos.json (default: auto-detect)',
        )

    def handle(self, *args, **options):
        from pathlib import Path

        draw = read_draw_data() or {}
        lottery_id = (draw.get('last_draw') or {}).get('lottery_id')
        json_path = Path(options['json']) if options.get('json') else None

        self.stdout.write('מייבא מאגר צירופים...')
        stats = reload_combo_pool_from_json(lottery_id=lottery_id, json_path=json_path)
        self.stdout.write(self.style.SUCCESS(
            f"יובאו {stats['totalImported']:,} צירופים — "
            f"{stats['free']:,} פנויים, {stats['preMarkedUsed']:,} כבר ניתנו בעבר"
        ))
        snap = pool_stats()
        self.stdout.write(f"state: {read_pool_state()}")
        self.stdout.write(f"pool: {snap['total']} total / {snap['free']} free")
