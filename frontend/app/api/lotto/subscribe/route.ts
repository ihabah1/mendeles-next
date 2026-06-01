import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getUniqueSetsForUser } from "@/lib/lotto";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { plan, draw_date } = await req.json();
  if (!["weekly", "monthly"].includes(plan))
    return NextResponse.json({ error: "תכנית לא תקינה" }, { status: 400 });

  const price = plan === "weekly" ? 25.0 : 50.0;
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balanceIls < price)
    return NextResponse.json({ error: "יתרה לא מספיקה", need_topup: true }, { status: 402 });

  const now = new Date();
  const expires = new Date(now.getTime() + (plan === "weekly" ? 7 : 30) * 86400000);
  const drawDate = draw_date || now.toISOString().slice(0, 10);
  const sets = await getUniqueSetsForUser(user.id, 200);

  await prisma.$transaction([
    prisma.wallet.update({ where: { userId: user.id }, data: { balanceIls: { decrement: price } } }),
    prisma.walletTx.create({ data: { userId: user.id, type: "charge", amountIls: -price, description: `מנוי ${plan}` } }),
    prisma.subscription.create({
      data: {
        userId: user.id, type: plan, priceIls: price, status: "active",
        startsAt: now, expiresAt: expires,
        lottoSets: {
          createMany: {
            data: sets.map(s => ({
              userId: user.id, drawDate, setIndex: s.setIndex,
              n1: s.n1, n2: s.n2, n3: s.n3, n4: s.n4, n5: s.n5, n6: s.n6, strong: s.strong,
            })),
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ status: "ok", sets_count: 200, expires_at: expires.toISOString(), plan, draw_date: drawDate });
}
