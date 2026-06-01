import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

function requireAdmin(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN;
}

const SMS_MSGS: Record<string, string> = {
  printed:   "🖨️ Mandeles: הטפסים שלך הודפסו. הזמנה: {n}",
  sent:      "📬 Mandeles: הטפסים שלך הוגשו למפעל הפיס! הזמנה: {n} 🍀",
  delivered: "✅ Mandeles: אישור הגשה עבור הזמנה {n}. בהצלחה!",
  cancelled: "❌ Mandeles: הזמנה {n} בוטלה. הכסף יוחזר לארנק.",
};

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const { order_id, status } = await req.json();
  const valid = ["paid","printed","sent","delivered","cancelled"];
  if (!valid.includes(status)) return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });

  const order = await prisma.lottoOrder.update({
    where: { id: order_id }, data: { status },
    include: { user: { select: { phone: true, name: true } } },
  });

  if (status === "cancelled") {
    await prisma.$transaction([
      prisma.wallet.update({ where: { userId: order.userId }, data: { balanceIls: { increment: order.totalIls } } }),
      prisma.walletTx.create({ data: { userId: order.userId, type: "refund", amountIls: order.totalIls, description: `החזר הזמנה ${order.orderNumber}`, refId: order.orderNumber } }),
    ]);
  }

  let smsSent = false;
  if (order.user.phone && SMS_MSGS[status]) {
    smsSent = await sendSms(order.user.phone, SMS_MSGS[status].replace("{n}", order.orderNumber));
  }

  return NextResponse.json({ status: "ok", sms_sent: smsSent, order_number: order.orderNumber });
}
