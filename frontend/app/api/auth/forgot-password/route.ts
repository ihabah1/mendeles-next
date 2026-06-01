import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "חסר אימייל" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user) {
    const token = crypto.randomBytes(48).toString("hex");
    const expires = new Date(Date.now() + 2 * 3600000);
    await prisma.resetToken.create({ data: { userId: user.id, token, expiresAt: expires } });

    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
    if (process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.FROM_EMAIL, to: email,
        subject: "איפוס סיסמה – Mandeles.co.il",
        html: `<div dir="rtl" style="font-family:Heebo,sans-serif;max-width:480px;background:#0d1b2a;padding:32px;border-radius:12px">
          <h2 style="color:#c9a84c">🎯 Mandeles – איפוס סיסמה</h2>
          <p style="color:#e8dcc8">לחץ על הכפתור לאיפוס הסיסמה שלך:</p>
          <a href="${resetLink}" style="display:inline-block;background:#c9a84c;color:#0d1b2a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:800;margin:16px 0">איפוס סיסמה</a>
          <p style="color:#8aaabe;font-size:.76rem">הקישור תקף ל-2 שעות.</p>
        </div>`,
      });
    }
  }
  return NextResponse.json({ status: "ok", message: `אם ${email} קיים, ישלח קישור` });
}
