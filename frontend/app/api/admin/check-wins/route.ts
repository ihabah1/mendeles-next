import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;
}

interface Prize { prize_rank: number; prize_type: string; prize_ils: number; hits_regular: number; hits_strong: number; }

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { draw_date, numbers, strong } = await req.json();
  if (!draw_date || !numbers || strong === undefined)
    return NextResponse.json({ error: "חסרים נתוני הגרלה" }, { status: 400 });

  // טען פרסים מ-CSV (משתמש בnumbers מה-env או default)
  const TABLE_PRICE = parseFloat(process.env.TABLE_PRICE_ILS || "2.5");
  const prizes: Prize[] = [
    { prize_rank: 1, prize_type: "ראשון",  prize_ils: 5000000, hits_regular: 6, hits_strong: 1 },
    { prize_rank: 2, prize_type: "שני",    prize_ils: 500000,  hits_regular: 6, hits_strong: 0 },
    { prize_rank: 3, prize_type: "שלישי",  prize_ils: 50000,   hits_regular: 5, hits_strong: 1 },
    { prize_rank: 4, prize_type: "רביעי",  prize_ils: 5000,    hits_regular: 5, hits_strong: 0 },
    { prize_rank: 5, prize_type: "חמישי",  prize_ils: 500,     hits_regular: 4, hits_strong: 1 },
    { prize_rank: 6, prize_type: "שישי",   prize_ils: 50,      hits_regular: 4, hits_strong: 0 },
    { prize_rank: 7, prize_type: "שביעי",  prize_ils: TABLE_PRICE, hits_regular: 3, hits_strong: 1 },
  ];

  // טען את כל הסטים להגרלה זו
  const sets = await prisma.lottoSet.findMany({
    where: { drawDate: draw_date },
    include: { user: { select: { id: true, phone: true } } },
  });

  const drawSet = new Set(numbers as number[]);
  const wins: { userId: number; setIndex: number; prizeRank: number; prizeType: string; prizeIls: number; orderId: number; }[] = [];
  let totalPrize = 0;

  for (const s of sets) {
    const setNums = new Set([s.n1, s.n2, s.n3, s.n4, s.n5, s.n6]);
    const hits = [...setNums].filter(n => drawSet.has(n)).length;
    const strongHit = s.strong === strong ? 1 : 0;

    for (const p of prizes) {
      if (p.hits_regular === hits && p.hits_strong === strongHit) {
        // מצא הזמנה
        const order = await prisma.lottoOrder.findFirst({
          where: { userId: s.userId, drawDate: draw_date },
        });
        if (order) {
          wins.push({ userId: s.userId, setIndex: s.setIndex, prizeRank: p.prize_rank, prizeType: p.prize_type, prizeIls: p.prize_ils, orderId: order.id });
          totalPrize += p.prize_ils;
        }
        break;
      }
    }
  }

  // שמור תוצאות
  const check = await prisma.winCheck.create({
    data: {
      drawDate: draw_date,
      drawNumbers: JSON.stringify({ nums: numbers, strong }),
      totalWins: wins.length,
      totalPrizeIls: totalPrize,
    },
  });

  if (wins.length > 0) {
    await prisma.win.createMany({
      data: wins.map(w => ({ ...w, checkId: check.id, drawDate: draw_date })),
    });
    // שלח SMS לזוכים
    for (const w of wins) {
      const user = await prisma.user.findUnique({ where: { id: w.userId } });
      if (user?.phone) {
        await sendSms(user.phone, `🎉 Mandeles: זכית ב${w.prizeType}! ₪${w.prizeIls.toLocaleString()} | הגרלה ${draw_date}`);
      }
    }
  }

  return NextResponse.json({ wins: wins.length, total_prize_ils: totalPrize, check_id: check.id });
}
