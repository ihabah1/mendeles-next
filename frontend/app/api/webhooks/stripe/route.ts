import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { default: prisma } = await import("@/lib/prisma");
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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
