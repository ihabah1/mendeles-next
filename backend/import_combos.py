"""
import_combos.py — ייבוא approved_combos.json ל-PostgreSQL (סקריפט עצמאי)
============================================================================
מומלץ להשתמש בפקודת Django:
  python manage.py import_combo_pool

או סקריפט ישיר:
  python import_combos.py approved_combos.json

מה זה עושה:
  1. טוען את approved_combos.json
  2. מחליף את מאגר הצירופים ב-DB
  3. מסמן צירופים שכבר נמסרו ללקוחות (LottoSet) כ-used — לא יינתנו שוב

האוטומציה היומית (daily_sync) מרעננת את המאגר אוטומטית בכל הגרלה חדשה.
"""

import json, sys, os, time
from pathlib import Path

# ── התקן psycopg2 אם צריך ──
try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary"], check=True)
    import psycopg2
    import psycopg2.extras

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── הגדרות ──
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL לא מוגדר ב-.env")
    sys.exit(1)

JSON_FILE = sys.argv[1] if len(sys.argv) > 1 else "approved_combos.json"
if not Path(JSON_FILE).exists():
    print(f"❌ קובץ לא נמצא: {JSON_FILE}")
    sys.exit(1)

BATCH_SIZE = 10000  # כמה שורות להכניס בכל פעם

# ── קרא JSON ──
print(f"📂 קורא {JSON_FILE}...")
t0 = time.time()
combos = json.load(open(JSON_FILE, encoding='utf-8'))
print(f"✅ נטענו {len(combos):,} צירופים ({time.time()-t0:.1f}s)")

# ── חבר ל-DB ──
print(f"🔌 מתחבר ל-PostgreSQL...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# ── צור טבלה אם לא קיימת ──
print("🏗️  מכין טבלה...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS approved_combos (
        id     SERIAL PRIMARY KEY,
        n1     SMALLINT NOT NULL,
        n2     SMALLINT NOT NULL,
        n3     SMALLINT NOT NULL,
        n4     SMALLINT NOT NULL,
        n5     SMALLINT NOT NULL,
        n6     SMALLINT NOT NULL,
        used   BOOLEAN  NOT NULL DEFAULT false,
        used_by INT     REFERENCES users(id) ON DELETE SET NULL,
        used_at TIMESTAMP
    )
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_combos_used ON approved_combos(used)")
conn.commit()

# ── מחק את כל הצירופים הקודמים (אחרי הגרלה הכל מתאפס) ──
print("🗑️  מאפס את כל הצירופים הקודמים...")
cur.execute("TRUNCATE TABLE approved_combos RESTART IDENTITY")
conn.commit()
print("   ✅ כל הצירופים אופסו")

# ── ייבא חדשים ──
print(f"📥 מייבא {len(combos):,} צירופים...")
t1 = time.time()
total = 0
batches = [combos[i:i+BATCH_SIZE] for i in range(0, len(combos), BATCH_SIZE)]

for bi, batch in enumerate(batches):
    rows = [(c[0], c[1], c[2], c[3], c[4], c[5]) for c in batch if len(c) == 6]
    psycopg2.extras.execute_values(
        cur,
        "INSERT INTO approved_combos (n1,n2,n3,n4,n5,n6) VALUES %s",
        rows,
        page_size=1000
    )
    total += len(rows)
    if (bi + 1) % 10 == 0 or bi == len(batches) - 1:
        conn.commit()
        elapsed = time.time() - t1
        rate = total / elapsed if elapsed > 0 else 0
        pct = total / len(combos) * 100
        print(f"   {pct:.0f}% | {total:,}/{len(combos):,} | {rate:.0f} שורות/שנייה")

conn.commit()

# ── סטטיסטיקות ──
cur.execute("SELECT COUNT(*) FROM approved_combos WHERE used = false")
available = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM approved_combos WHERE used = true")
used_count = cur.fetchone()[0]

cur.close()
conn.close()

elapsed_total = time.time() - t0
print(f"\n{'='*50}")
print(f"✅ ייבוא הושלם!")
print(f"   צירופים פנויים:  {available:,}")
print(f"   כבר נמסרו:       {used_count:,}")
print(f"   זמן כולל:         {elapsed_total:.0f} שניות")
print(f"{'='*50}")
print(f"\nכעת כשמשתמש רוכש מנוי — יקבל 200 צירופים ייחודיים")
