"""
create_demo_user.py — יצירת משתמש דמו ב-PostgreSQL (Neon)
הרץ: python create_demo_user.py
"""
import subprocess, sys, os

# התקן psycopg2 אם צריך
try:
    import psycopg2
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary"], check=True)
    import psycopg2

try:
    import bcrypt
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "bcrypt"], check=True)
    import bcrypt

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_pGqyh9i8oYAW@ep-winter-river-ap4j3ytq-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require")

DEMO_EMAIL = "demo@mandeles.co.il"
DEMO_PASS  = "Demo1234!"
DEMO_NAME  = "חשבון דמו"
DEMO_PHONE = "+972500000000"
DEMO_BALANCE = 500.0

pw_hash = bcrypt.hashpw(DEMO_PASS.encode(), bcrypt.gensalt(12)).decode()

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# מחק דמו קיים
cur.execute('DELETE FROM users WHERE email=%s OR phone=%s', (DEMO_EMAIL, DEMO_PHONE))

# צור משתמש
cur.execute('''
    INSERT INTO users (name, email, phone, "pwHash", provider, "emailVerified", "phoneVerified", active)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING id
''', (DEMO_NAME, DEMO_EMAIL, DEMO_PHONE, pw_hash, 'local', True, True, True))
uid = cur.fetchone()[0]

# ארנק
cur.execute('INSERT INTO wallet ("userId", "balanceIls", "updatedAt") VALUES (%s, %s, NOW()) ON CONFLICT ("userId") DO UPDATE SET "balanceIls"=%s, "updatedAt"=NOW()', (uid, DEMO_BALANCE, DEMO_BALANCE))

# transaction
cur.execute('INSERT INTO wallet_tx ("userId", type, "amountIls", description) VALUES (%s, %s, %s, %s)',
    (uid, 'deposit', DEMO_BALANCE, 'יתרת פתיחה — חשבון דמו'))

conn.commit()
cur.close()
conn.close()

print(f"✅ משתמש דמו נוצר בהצלחה!")
print(f"   אימייל:  {DEMO_EMAIL}")
print(f"   סיסמה:   {DEMO_PASS}")
print(f"   יתרה:    ₪{DEMO_BALANCE:.0f}")
print(f"   user_id: {uid}")