import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const [totalUsers, newToday, activeSubs, pendingOrders, revenueSum, winsSum] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.lottoOrder.count({ where: { status: "paid" } }),
    prisma.walletTx.aggregate({ where: { type: "topup" }, _sum: { amountIls: true } }),
    prisma.winCheck.aggregate({ _sum: { totalWins: true, totalPrizeIls: true } }),
  ]);
  return NextResponse.json({
    total_users: totalUsers, new_today: newToday, active_subs: activeSubs,
    pending_orders: pendingOrders, total_revenue: revenueSum._sum.amountIls ?? 0,
    total_wins: winsSum._sum.totalWins ?? 0, total_prize: winsSum._sum.totalPrizeIls ?? 0,
  });
}
