import { NextRequest, NextResponse } from "next/server";
import { sendOtp, verifyOtp } from "@/lib/sms";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { phone, code, action = "send" } = await req.json();
  if (!phone) return NextResponse.json({ error: "חסר מספר טלפון" }, { status: 400 });
  if (action === "send") {
    const ok = await sendOtp(phone);
    return ok ? NextResponse.json({ status: "sent" }) : NextResponse.json({ error: "שגיאת שליחה" }, { status: 500 });
  }
  if (!code) return NextResponse.json({ error: "חסר קוד" }, { status: 400 });
  const ok = await verifyOtp(phone, code);
  if (!ok) return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return NextResponse.json({ error: "מספר לא רשום" }, { status: 404 });
  if (!user.active) return NextResponse.json({ error: "חשבון מושהה" }, { status: 403 });
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), phoneVerified: true } });
  const token = await signToken({ sub: user.id, email: user.email, phone: user.phone });
  const res = NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  res.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400 });
  return res;
}
