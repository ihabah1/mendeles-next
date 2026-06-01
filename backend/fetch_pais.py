"""
fetch_pais.py — מושך תוצאות לוטו מפאיס ומעדכן draw_results.json
הרץ אחרי כל הגרלה:
  python fetch_pais.py
  python fetch_pais.py 3930  (הגרלה ספציפית)
"""
import sys, re, json, ssl
from pathlib import Path
from datetime import datetime
from urllib.request import urlopen, Request

LOTTERY_ID = sys.argv[1] if len(sys.argv) > 1 else None

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "he-IL,he;q=0.9",
    })
    return urlopen(req, context=ctx, timeout=15).read().decode("utf-8", errors="replace")

# מצא הגרלה אחרונה
if not LOTTERY_ID:
    print("🔍 מחפש הגרלה אחרונה...")
    archive = fetch("https://www.pais.co.il/lotto/archive.aspx")
    ids = re.findall(r'lotteryId=(\d+)', archive)
    LOTTERY_ID = str(max(int(x) for x in ids)) if ids else "3930"
    print(f"   הגרלה: {LOTTERY_ID}")

print(f"📥 מוריד הגרלה {LOTTERY_ID}...")
html = fetch(f"https://www.pais.co.il/Lotto/CurrentLotto.aspx?lotteryId={LOTTERY_ID}")

# תאריך
date_m = re.search(r'(\d{2})/(\d{2})/(\d{4})', html)
date = f"{date_m.group(3)}-{date_m.group(2)}-{date_m.group(1)}" if date_m else datetime.now().strftime("%Y-%m-%d")

# מספרים
nums_section = re.search(r'aria-label="המספרים שעלו בגורל"([\s\S]{0,3000}?)</ol>', html)
numbers = [int(m) for m in re.findall(r'class="loto_info_num">\s*<div[^>]*>(\d{1,2})</div>', nums_section.group(1) if nums_section else "")]

# חזק
strong_m = re.search(r'aria-label="המספר החזק (\d{1,2})"', html)
strong = int(strong_m.group(1)) if strong_m else 0

# פרסים
prizes_section = re.search(r'id="regularLottoList"([\s\S]{0,10000}?)</ol>', html)
if prizes_section:
    winners = [int(m.replace(",","")) for m in re.findall(r'aria-label="מספר זוכים ([\d,]+)"', prizes_section.group(1))]
    amounts = [int(m.replace(",","")) for m in re.findall(r'aria-label="סכום זכייה ([\d,]+)\s*₪"', prizes_section.group(1))]
else:
    winners, amounts = [], []

if len(numbers) != 6:
    print(f"❌ נמצאו {len(numbers)} מספרים (צריך 6)")
    sys.exit(1)

rank_keys  = ["6+strong","6","5+strong","5","4+strong","4","3+strong","3"]
rank_names = ["6 + חזק","6","5 + חזק","5","4 + חזק","4","3 + חזק","3"]

result = {
    "last_draw": {
        "date": date,
        "numbers": numbers,
        "strong": strong,
        "lottery_id": int(LOTTERY_ID)
    },
    "prizes": {
        key: {"name": rank_names[i], "ils": amounts[i] if i < len(amounts) else 0}
        for i, key in enumerate(rank_keys)
    },
    "updated_at": datetime.now().isoformat()
}

out = Path("draw_results.json")
out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"✅ הגרלה {LOTTERY_ID} | {date}")
print(f"   מספרים: {numbers} | חזק: {strong}")
print(f"   פרסים: {len(amounts)} דרגות")
for i, key in enumerate(rank_keys):
    if i < len(amounts):
        print(f"   {key}: {winners[i] if i < len(winners) else 0} זוכים | ₪{amounts[i]:,}")
print(f"\n📄 נשמר ל-draw_results.json")
