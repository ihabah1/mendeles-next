#!/usr/bin/env python3
"""
export_sqlite.py — ייצוא נתונים מ-SQLite ל-PostgreSQL
הרץ מתיקיית הפרויקט הישן:
  python scripts/export_sqlite.py
ואז:
  psql $DATABASE_URL < data/import_all.sql
"""
import sqlite3, os, sys
from pathlib import Path
from datetime import datetime

AUTH_DB = os.getenv("AUTH_DB_PATH", "data/auth.db")
if not Path(AUTH_DB).exists():
    print(f"❌ DB לא נמצא: {AUTH_DB}")
    sys.exit(1)

db = sqlite3.connect(AUTH_DB)
db.row_factory = sqlite3.Row
Path("data").mkdir(exist_ok=True)

def esc(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def ts(v):
    return esc(v) if v else "NOW()"

lines = [f"-- Export {datetime.now()}", "BEGIN;", ""]
users  = db.execute("SELECT * FROM users ORDER BY id").fetchall()
wallets= db.execute("SELECT * FROM wallet").fetchall()
txs    = db.execute("SELECT * FROM wallet_tx ORDER BY id").fetchall()
subs   = db.execute("SELECT * FROM subscriptions ORDER BY id").fetchall()
sets   = db.execute("SELECT * FROM lotto_sets ORDER BY id").fetchall()
orders = db.execute("SELECT * FROM lotto_orders ORDER BY id").fetchall()

if users:
    lines += ["INSERT INTO users (id,name,email,phone,\"pwHash\",provider,\"providerId\",\"emailVerified\",\"phoneVerified\",active,\"createdAt\",\"lastLogin\") VALUES",
              ",\n".join([f"({u['id']},{esc(u['name'])},{esc(u['email'])},{esc(u['phone'])},{esc(u['pw_hash'])},{esc(u['provider'])},{esc(u.get('provider_id'))},{'true' if u['email_verified'] else 'false'},{'true' if u.get('phone_verified',0) else 'false'},{'true' if u['active'] else 'false'},{ts(u['created_at'])},{ts(u.get('last_login'))})" for u in users])+";",
              "SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));",""]

if wallets:
    lines += ["INSERT INTO wallet (\"userId\",\"balanceIls\",\"updatedAt\") VALUES",
              ",\n".join([f"({w['user_id']},{w['balance_ils']},{ts(w.get('updated_at'))})" for w in wallets])+";",""]

if txs:
    lines += ["INSERT INTO wallet_tx (id,\"userId\",type,\"amountIls\",description,\"refId\",\"createdAt\") VALUES",
              ",\n".join([f"({t['id']},{t['user_id']},{esc(t['type'])},{t['amount_ils']},{esc(t.get('description'))},{esc(t.get('ref_id'))},{ts(t.get('created_at'))})" for t in txs])+";",
              "SELECT setval('wallet_tx_id_seq', (SELECT MAX(id) FROM wallet_tx));",""]

if subs:
    lines += ["INSERT INTO subscriptions (id,\"userId\",type,\"priceIls\",\"stripeId\",status,\"startsAt\",\"expiresAt\",\"createdAt\") VALUES",
              ",\n".join([f"({s['id']},{s['user_id']},{esc(s['type'])},{s['price_ils']},{esc(s.get('stripe_id'))},{esc(s['status'])},{ts(s['starts_at'])},{ts(s['expires_at'])},{ts(s.get('created_at'))})" for s in subs])+";",
              "SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions));",""]

if sets:
    lines += ["INSERT INTO lotto_sets (id,\"userId\",\"subscriptionId\",\"drawDate\",\"setIndex\",n1,n2,n3,n4,n5,n6,strong,\"createdAt\") VALUES",
              ",\n".join([f"({s['id']},{s['user_id']},{s['subscription_id'] or 'NULL'},{esc(s['draw_date'])},{s['set_index']},{s['n1']},{s['n2']},{s['n3']},{s['n4']},{s['n5']},{s['n6']},{s['strong']},{ts(s.get('created_at'))})" for s in sets])+";",
              "SELECT setval('lotto_sets_id_seq', (SELECT MAX(id) FROM lotto_sets));",""]

if orders:
    lines += ["INSERT INTO lotto_orders (id,\"orderNumber\",\"userId\",\"drawDate\",\"tablesCount\",\"tablePriceIls\",\"commissionIls\",\"totalIls\",status,\"setsJson\",notes,\"createdAt\",\"updatedAt\") VALUES",
              ",\n".join([f"({o['id']},{esc(o['order_number'])},{o['user_id']},{esc(o['draw_date'])},{o['tables_count']},{o['table_price_ils']},{o['commission_ils']},{o['total_ils']},{esc(o['status'])},{esc(o.get('sets_json'))},{esc(o.get('notes'))},{ts(o.get('created_at'))},{ts(o.get('updated_at') or o.get('created_at'))})" for o in orders])+";",
              "SELECT setval('lotto_orders_id_seq', (SELECT MAX(id) FROM lotto_orders));",""]

db.close()
lines.append("COMMIT;")
Path("data/import_all.sql").write_text("\n".join(lines), encoding="utf-8")
print(f"✅ {len(users)} users | {len(wallets)} wallets | {len(subs)} subs | {len(sets)} sets | {len(orders)} orders")
print("הרץ: psql $DATABASE_URL < data/import_all.sql")
