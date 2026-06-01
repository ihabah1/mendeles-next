import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "סיסמה קצרה מדי" }, { status: 400 });

  const row = await prisma.resetToken.findUnique({ where: { token } });
  if (!row || row.used) return NextResponse.json({ error: "טוקן לא תקין" }, { status: 400 });
  if (new Date() > row.expiresAt) return NextResponse.json({ error: "טוקן פג תוקף" }, { status: 400 });

  await prisma.user.update({ where: { id: row.userId }, data: { pwHash: await hashPassword(password) } });
  await prisma.resetToken.update({ where: { id: row.id }, data: { used: true } });
  return NextResponse.json({ status: "ok", message: "הסיסמה עודכנה" });
}
