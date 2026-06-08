import { NextResponse } from "next/server";
import prisma, { isDatabaseConfigured } from "@/lib/prisma";

export const revalidate = 300;

interface DrawData {
  last_draw: { date: string; numbers: number[]; strong: number; lottery_id?: number };
  prizes: Record<string, { name: string; ils: number }>;
}

function calcRank(nums: number[], strong: number, drawNums: number[], drawStrong: number): string | null {
  const hits = nums.filter(n => drawNums.includes(n)).length;
  const strongHit = strong === drawStrong;
  if (hits === 6 && strongHit) return "6+strong";
  if (hits === 6)              return "6";
  if (hits === 5 && strongHit) return "5+strong";
  if (hits === 5)              return "5";
  if (hits === 4 && strongHit) return "4+strong";
  if (hits === 4)              return "4";
  if (hits === 3 && strongHit) return "3+strong";
  if (hits === 3)              return "3";
  return null;
}

async function fetchDrawFromBackend(): Promise<DrawData | null> {
  const apiBase =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:8000/api";
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/lotto/draw/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.last_draw) return null;
    return data as DrawData;
  } catch {
    return null;
  }
}

export async function GET() {
  const drawData = await fetchDrawFromBackend();

  const db = isDatabaseConfigured();
  const [totalUsers, totalOrders] = db
    ? await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.lottoOrder.count().catch(() => 0),
      ])
    : [0, 0];

  let winStats: Record<string, number> = {};
  let totalWinners = 0;
  let totalPrize = 0;

  if (drawData && db) {
    const { numbers: drawNums, strong: drawStrong } = drawData.last_draw;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sets = await prisma.lottoSet.findMany({
      select: { n1:true, n2:true, n3:true, n4:true, n5:true, n6:true, strong:true }
    }).catch(() => [] as any[]);

    for (const s of sets) {
      const rank = calcRank([s.n1,s.n2,s.n3,s.n4,s.n5,s.n6], s.strong, drawNums, drawStrong);
      if (rank) {
        winStats[rank] = (winStats[rank] || 0) + 1;
        totalWinners++;
        totalPrize += drawData.prizes[rank]?.ils || 0;
      }
    }
  }

  return NextResponse.json({
    total_users:   totalUsers,
    total_orders:  totalOrders,
    last_draw:     drawData?.last_draw || null,
    prizes:        drawData?.prizes || null,
    win_stats:     winStats,
    total_winners: totalWinners,
    total_prize:   totalPrize,
  });
}
