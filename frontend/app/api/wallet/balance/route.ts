import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ balance: wallet?.balanceIls ?? 0, currency: "ILS" });
}
