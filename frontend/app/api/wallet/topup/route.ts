import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const { amount_ils } = await req.json();
  if (!amount_ils || amount_ils < 10 || amount_ils > 5000)
    return NextResponse.json({ error: "סכום לא תקין (10-5000)" }, { status: 400 });

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount_ils * 100),
    currency: "ils",
    metadata: { user_id: String(user.id), type: "wallet_topup", amount_ils: String(amount_ils) },
  });
  return NextResponse.json({ client_secret: intent.client_secret, payment_id: intent.id, amount_ils });
}
