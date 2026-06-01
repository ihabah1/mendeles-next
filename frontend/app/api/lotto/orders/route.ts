import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const orders = await prisma.lottoOrder.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ orders: orders.map((o: any) => ({ ...o, sets_json: JSON.parse(o.setsJson || "[]") })) });
}
