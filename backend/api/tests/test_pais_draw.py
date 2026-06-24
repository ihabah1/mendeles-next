"""Tests for PAIS draw fetch fallbacks."""
import json
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from api.services import pais_draw


SAMPLE_HTML = """
<div aria-label="המספרים שעלו בגורל">
<ol><li class="loto_info_num"><div>1</div></li>
<li class="loto_info_num"><div>2</div></li>
<li class="loto_info_num"><div>3</div></li>
<li class="loto_info_num"><div>4</div></li>
<li class="loto_info_num"><div>5</div></li>
<li class="loto_info_num"><div>6</div></li></ol>
</div>
<span aria-label="המספר החזק 7"></span>
01/06/2026
<ol id="regularLottoList">
<li aria-label="מספר זוכים 1" aria-label="סכום זכייה 100 ₪"></li>
</ol>
"""

CACHED = {
    'last_draw': {
        'date': '2026-05-30',
        'numbers': [10, 23, 25, 28, 32, 33],
        'strong': 4,
        'lottery_id': 3930,
    },
    'prizes': {},
    'updated_at': '2026-05-31T00:00:00',
}


class PaisDrawFetchTests(SimpleTestCase):
    def test_cached_draw_is_usable(self):
        self.assertTrue(pais_draw._cached_draw_is_usable(CACHED))
        self.assertFalse(pais_draw._cached_draw_is_usable({'last_draw': {'numbers': [1, 2]}}))

    @override_settings(FRONTEND_URL='https://frontend.example')
    @patch('api.services.pais_draw._scrape_pais_direct')
    @patch('api.services.pais_draw._fetch_via_frontend_api')
    @patch('api.services.pais_draw.read_draw_data', return_value=CACHED)
    def test_prefers_direct_before_proxy(self, _mock_read, mock_proxy, mock_direct):
        mock_direct.return_value = {**CACHED, 'updated_at': '2026-06-01T00:00:00'}
        with patch.object(pais_draw, 'draw_results_path') as mock_path:
            mock_file = MagicMock()
            mock_path.return_value = mock_file
            result = pais_draw.fetch_and_save_draw()
        mock_direct.assert_called_once()
        mock_proxy.assert_not_called()
        mock_file.write_text.assert_called_once()
        self.assertEqual(result['last_draw']['lottery_id'], 3930)

    @override_settings(FRONTEND_URL='')
    @patch('api.services.pais_draw.fetch_and_save_draw', side_effect=RuntimeError('timeout'))
    @patch('api.services.pais_draw.read_draw_data', return_value=CACHED)
    def test_load_draw_for_sync_uses_cache(self, _mock_read, _mock_fetch):
        draw, warning = pais_draw.load_draw_for_sync()
        self.assertEqual(draw['last_draw']['lottery_id'], 3930)
        self.assertIn('מטמון', warning or '')

    @override_settings(FRONTEND_URL='')
    @patch('api.services.pais_draw._skip_live_fetch', return_value=True)
    @patch('api.services.pais_draw.read_draw_data', return_value=CACHED)
    @patch('api.services.pais_draw._scrape_pais_direct')
    def test_skip_live_fetch_uses_cache(self, mock_direct, _mock_read, _mock_skip):
        result = pais_draw.fetch_and_save_draw()
        mock_direct.assert_not_called()
        self.assertEqual(result['last_draw']['lottery_id'], 3930)

    @override_settings(FRONTEND_URL='')
    @patch('api.services.pais_draw.read_draw_data', return_value=CACHED)
    @patch('api.services.pais_draw._scrape_pais_direct', side_effect=TimeoutError('network'))
    def test_falls_back_to_cache_when_all_fail(self, _mock_direct, _mock_read):
        result = pais_draw.fetch_and_save_draw()
        self.assertEqual(result['last_draw']['lottery_id'], 3930)

    @patch('api.services.pais_draw.read_draw_data', return_value=None)
    @patch('api.services.pais_draw.ensure_draw_results_file')
    @patch('api.services.pais_draw._scrape_pais_direct', side_effect=TimeoutError('network'))
    def test_raises_when_no_cache(self, _mock_direct, _mock_ensure, _mock_read):
        with self.assertRaises(RuntimeError):
            pais_draw.fetch_and_save_draw()

    @patch('api.services.pais_draw._fetch', return_value=SAMPLE_HTML)
    def test_parse_draw_html(self, _mock_fetch):
        parsed = pais_draw._parse_draw_html(SAMPLE_HTML, '3931')
        self.assertEqual(parsed['last_draw']['numbers'], [1, 2, 3, 4, 5, 6])
        self.assertEqual(parsed['last_draw']['strong'], 7)
        self.assertEqual(parsed['last_draw']['lottery_id'], 3931)

    @patch('api.services.pais_draw._cached_lottery_id', return_value=3930)
    @patch('api.services.pais_draw._fetch')
    def test_resolve_lottery_id_uses_cache(self, mock_fetch, _mock_cached):
        resolved = pais_draw._resolve_lottery_id(None)
        self.assertEqual(resolved, '3930')
        mock_fetch.assert_not_called()
