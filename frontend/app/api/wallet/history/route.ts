import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const txs = await prisma.walletTx.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50,
  });
  return NextResponse.json({ transactions: txs });
}
