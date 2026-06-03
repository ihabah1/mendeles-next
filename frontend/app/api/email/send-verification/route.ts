import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email/send-verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const trimmed = email?.trim().toLowerCase();
    if (!trimmed) {
      return NextResponse.json({ detail: "נדרש אימייל" }, { status: 400 });
    }

    await sendVerificationEmail(trimmed);
    return NextResponse.json({
      detail: "אימייל אימות נשלח. בדוק את תיבת הדואר (גם בספאם).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "שליחה נכשלה";
    return NextResponse.json({ detail: message }, { status: 503 });
  }
}
