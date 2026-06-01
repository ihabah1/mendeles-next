import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { verifyOtp } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const { name, phone, code, email, password, method = "phone" } = await req.json();
  if (!name || !phone || !code) return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  const otpOk = await verifyOtp(phone, code);
  if (!otpOk) return NextResponse.json({ error: "קוד אימות שגוי" }, { status: 401 });
  const exists = await prisma.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
  if (exists) return NextResponse.json({ error: "מספר/אימייל כבר רשום" }, { status: 409 });
  const pwHash = method === "email" && password ? await hashPassword(password) : null;
  const user = await prisma.user.create({
    data: { name, phone, email: email || null, pwHash, provider: "local", phoneVerified: true, emailVerified: !!email },
  });
  const token = await signToken({ sub: user.id, email: user.email, phone: user.phone });
  const res = NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } }, { status: 201 });
  res.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400 });
  return res;
}
