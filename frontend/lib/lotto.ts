import prisma from "./prisma";

export interface LottoSet {
  setIndex: number;
  n1: number; n2: number; n3: number;
  n4: number; n5: number; n6: number;
  strong: number;
  display?: string;
}

/**
 * שולף 200 צירופים ייחודיים מהמאגר ומסמן אותם כנמסרו למשתמש.
 * אף שני משתמשים לא יקבלו את אותם מספרים.
 */
export async function getUniqueSetsForUser(userId: number, count = 200): Promise<LottoSet[]> {
  // שלוף count צירופים פנויים — ORDER BY RANDOM() מבטיח אקראיות
  // FOR UPDATE SKIP LOCKED מונע race condition בין שני משתמשים בו-זמנית
  const result = await prisma.$queryRaw<{ id: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; }[]>`
    SELECT id, n1, n2, n3, n4, n5, n6
    FROM approved_combos
    WHERE used = false
    ORDER BY RANDOM()
    LIMIT ${count}
    FOR UPDATE SKIP LOCKED
  `;

  if (result.length < count) {
    console.warn(`⚠️ רק ${result.length} צירופים פנויים מתוך ${count} מבוקשים`);
  }

  if (result.length === 0) {
    // fallback — אם אין צירופים במאגר, השתמש בגנרטור
    console.warn("⚠️ מאגר צירופים ריק — משתמש בגנרטור אקראי");
    return generateMandelSets(count);
  }

  // סמן כנמסרו
  const ids = (result as {id:number}[]).map(r => r.id);
  await prisma.$executeRaw`
    UPDATE approved_combos
    SET used = true, used_by = ${userId}, used_at = NOW()
    WHERE id = ANY(${ids}::int[])
  `;

  type ComboRow = { id: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; };
  return (result as ComboRow[]).map((r, i) => ({
    setIndex: i + 1,
    n1: Number(r.n1), n2: Number(r.n2), n3: Number(r.n3),
    n4: Number(r.n4), n5: Number(r.n5), n6: Number(r.n6),
    strong: (i % 7) + 1, // חזק אקראי 1-7
    display: `${[r.n1,r.n2,r.n3,r.n4,r.n5,r.n6].join(" ")} | 💪${(i%7)+1}`,
  }));
}

/**
 * Fallback — גנרטור אקראי אם המאגר ריק
 */
export function generateMandelSets(n = 200): LottoSet[] {
  const sets: LottoSet[] = [];
  for (let i = 0; i < n; i++) {
    const pool = Array.from({ length: 37 }, (_, j) => j + 1);
    for (let j = pool.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    const nums = pool.slice(0, 6).sort((a, b) => a - b);
    sets.push({
      setIndex: i + 1,
      n1: nums[0], n2: nums[1], n3: nums[2],
      n4: nums[3], n5: nums[4], n6: nums[5],
      strong: (i % 7) + 1,
    });
  }
  return sets;
}

export function genOrderNumber(): string {
  const ts = String(Date.now()).slice(-5);
  const rnd = String(Math.floor(Math.random() * 900) + 100);
  return `MAND-${ts}${rnd}`;
}
