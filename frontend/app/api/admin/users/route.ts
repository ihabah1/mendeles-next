import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { wallet: true, _count: { select: { lottoOrders: true } } },
  });
  return NextResponse.json({ users });
}
