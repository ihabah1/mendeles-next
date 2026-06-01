import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { genOrderNumber } from "@/lib/lotto";

const TABLE_PRICE = parseFloat(process.env.TABLE_PRICE_ILS || "2.5");
const COMMISSION = parseFloat(process.env.COMMISSION_ILS || "5.0");

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const body = await req.json();
  const { sets, draw_date, is_double } = body;
  
  // קרא lottery_id מdraw_results.json
  let lotteryId: number | null = null;
  try {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const dr = JSON.parse(readFileSync(join(process.cwd(), "draw_results.json"), "utf-8"));
    lotteryId = dr.last_draw?.lottery_id || null;
  } catch {}
  if (!sets || sets.length < 2) return NextResponse.json({ error: "מינימום 2 טבלאות" }, { status: 400 });
  if (sets.length % 2 !== 0) return NextResponse.json({ error: "שליחה בזוגות בלבד" }, { status: 400 });
  if (sets.length > 200) return NextResponse.json({ error: "מקסימום 200 טבלאות" }, { status: 400 });

  // validate each set
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const nums = [s.n1,s.n2,s.n3,s.n4,s.n5,s.n6];
    if (!nums.every((n: number) => Number.isInteger(n) && n >= 1 && n <= 37))
      return NextResponse.json({ error: `סט ${i+1}: מספרים לא תקינים` }, { status: 400 });
    if (new Set(nums).size !== 6)
      return NextResponse.json({ error: `סט ${i+1}: מספרים כפולים` }, { status: 400 });
    if (!Number.isInteger(s.strong) || s.strong < 1 || s.strong > 7)
      return NextResponse.json({ error: `סט ${i+1}: חזק לא תקין` }, { status: 400 });
  }

  const pricePerTable = (TABLE_PRICE + COMMISSION) * (is_double ? 2 : 1);
  const total = sets.length * pricePerTable;
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balanceIls < total)
    return NextResponse.json({ error: "יתרה לא מספיקה", need_topup: true, shortfall: total - (wallet?.balanceIls ?? 0) }, { status: 402 });

  const orderNumber = genOrderNumber();
  const drawDate = draw_date || new Date().toISOString().slice(0, 10);
  const setsJson = JSON.stringify(sets.map((s: typeof sets[0], i: number) => ({
    set_index: s.set_index ?? i + 1,
    nums: [s.n1,s.n2,s.n3,s.n4,s.n5,s.n6],
    strong: s.strong,
    display: `${[s.n1,s.n2,s.n3,s.n4,s.n5,s.n6].join(" ")} | ${s.strong}`,
  })));

  await prisma.$transaction([
    prisma.wallet.update({ where: { userId: user.id }, data: { balanceIls: { decrement: total } } }),
    prisma.walletTx.create({
      data: { userId: user.id, type: "charge", amountIls: -total, description: `הזמנה ${orderNumber} (${sets.length} טבלאות)`, refId: orderNumber },
    }),
    prisma.lottoOrder.create({
      data: {
        orderNumber, userId: user.id, drawDate,
        tablesCount: sets.length, tablePriceIls: TABLE_PRICE * (is_double ? 2 : 1),
        commissionIls: COMMISSION, totalIls: total, setsJson,
        isDouble: is_double || false,
        lotteryId: lotteryId,
      },
    }),
  ]);

  return NextResponse.json({ status: "ok", order_number: orderNumber, tables_count: sets.length, total_ils: total, message: `ההזמנה ${orderNumber} התקבלה!` });
}