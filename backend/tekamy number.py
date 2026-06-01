import psycopg2
 
DATABASE_URL = "postgresql://neondb_owner:npg_pGqyh9i8oYAW@ep-winter-river-ap4j3ytq-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
 
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
 
cur.execute('ALTER TABLE lotto_orders ADD COLUMN IF NOT EXISTS "isDouble" BOOLEAN DEFAULT false')
cur.execute('ALTER TABLE lotto_orders ADD COLUMN IF NOT EXISTS "lotteryId" INTEGER')
 
conn.commit()
cur.close()
conn.close()
print("OK — עמודות נוספו!")
 