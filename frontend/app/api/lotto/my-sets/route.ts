import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const drawDate = new URL(req.url).searchParams.get("draw_date");
  const sets = await prisma.lottoSet.findMany({
    where: { userId: user.id, ...(drawDate ? { drawDate } : {}) },
    orderBy: [{ drawDate: "desc" }, { setIndex: "asc" }],
  });
  const enriched = sets.map((s: typeof sets[number]) => ({
    ...s,
    display: `${[s.n1,s.n2,s.n3,s.n4,s.n5,s.n6].join(" ")} | 💪${s.strong}`,
  }));
  return NextResponse.json({ sets: enriched, count: sets.length });
}
