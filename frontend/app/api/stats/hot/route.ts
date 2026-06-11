import { NextResponse } from "next/server";
import prisma, { isDatabaseConfigured } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  const db = isDatabaseConfigured();
  if (!db) return NextResponse.json({ counts: [], total_sets: 0 });

  // load all sets (select only number fields)
  // if DB is large, consider doing aggregation in SQL instead.
  // This reads lottoSet table and tallies occurrences of numbers.
  const sets = await prisma.lottoSet.findMany({
    select: { n1: true, n2: true, n3: true, n4: true, n5: true, n6: true },
  }).catch(() => [] as any[]);

  const maxNum = 40; // safe upper bound for number range
  const counts: number[] = new Array(maxNum + 1).fill(0);

  for (const s of sets) {
    const nums = [s.n1, s.n2, s.n3, s.n4, s.n5, s.n6];
    for (const n of nums) if (typeof n === 'number' && n > 0 && n <= maxNum) counts[n]++;
  }

  const list = counts
    .map((c, idx) => ({ number: idx, count: c }))
    .filter(item => item.number > 0)
    .sort((a, b) => b.count - a.count || a.number - b.number);

  return NextResponse.json({ counts: list, total_sets: sets.length });
}
