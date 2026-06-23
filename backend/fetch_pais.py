"""
fetch_pais.py — מושך תוצאות לוטו מפאיס ומעדכן draw_results.json
הרץ אחרי כל הגרלה:
  python fetch_pais.py
  python fetch_pais.py 3930  (הגרלה ספציפית)
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mandeles_portal.settings')

import django

django.setup()

from api.services.pais_draw import fetch_and_save_draw

LOTTERY_ID = sys.argv[1] if len(sys.argv) > 1 else None

if __name__ == '__main__':
    result = fetch_and_save_draw(LOTTERY_ID)
    last = result['last_draw']
    print(f"✅ הגרלה {last['lottery_id']} | {last['date']}")
    print(f"   מספרים: {last['numbers']} | חזק: {last['strong']}")
