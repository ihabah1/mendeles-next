import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.pwHash || !(await checkPassword(password, user.pwHash)))
    return NextResponse.json({ error: "אימייל או סיסמה שגויים" }, { status: 401 });
  if (!user.active)
    return NextResponse.json({ error: "חשבון מושהה" }, { status: 403 });

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const token = await signToken({ sub: user.id, email: user.email, phone: user.phone });
  const res = NextResponse.json({
    token, redirect: "/",
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
  });
  res.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400 });
  return res;
}
