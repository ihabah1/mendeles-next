import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    if (pi.metadata?.type === "wallet_topup") {
      const uid = parseInt(pi.metadata.user_id);
      const amount = parseFloat(pi.metadata.amount_ils);
      await prisma.wallet.upsert({
        where: { userId: uid },
        update: { balanceIls: { increment: amount } },
        create: { userId: uid, balanceIls: amount },
      });
      await prisma.walletTx.create({
        data: { userId: uid, type: "topup", amountIls: amount, description: `טעינת ארנק ₪${amount}`, refId: pi.id },
      });
    }
  }
  return NextResponse.json({ received: true });
}
