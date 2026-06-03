import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email/send-verification";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      verification_payload?: {
        to: string;
        display_name: string;
        verify_url: string;
      };
    };
    const trimmed = body.email?.trim().toLowerCase();
    if (!trimmed) {
      return NextResponse.json({ detail: "נדרש אימייל" }, { status: 400 });
    }

    const payload = body.verification_payload;
    if (
      payload?.to &&
      payload.verify_url &&
      payload.to.toLowerCase() === trimmed
    ) {
      await sendVerificationEmail(trimmed, payload);
    } else {
      await sendVerificationEmail(trimmed);
    }
    return NextResponse.json({
      detail: "אימייל אימות נשלח. בדוק את תיבת הדואר (גם בספאם).",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "שליחה נכשלה";
    return NextResponse.json({ detail: message }, { status: 503 });
  }
}
