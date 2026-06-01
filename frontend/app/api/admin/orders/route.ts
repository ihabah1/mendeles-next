import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status");
  const orders = await prisma.lottoOrder.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true, phone: true, email: true } } },
  });
  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orders: orders.map((o: any) => ({ ...o, sets_json: JSON.parse(o.setsJson || "[]") })),
    count: orders.length,
  });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const { order_id, status } = await req.json();
  const valid = ["paid","printed","sent","delivered","cancelled"];
  if (!valid.includes(status)) return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  await prisma.lottoOrder.update({ where: { id: order_id }, data: { status } });
  return NextResponse.json({ status: "ok" });
}
