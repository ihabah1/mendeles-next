/**
 * Server-side Resend send (used by /api/email/send-verification).
 * Backend may omit RESEND — keys live on Frontend only.
 */
import {
  isLocalApiBase,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";
import { getEmailProxySecret } from "@/lib/email/proxy-secret";

const RESEND_API_URL = "https://api.resend.com/emails";

function resendFromFrontend(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return Boolean(key && from);
}

async function fetchVerificationPayload(email: string): Promise<{
  to: string;
  display_name: string;
  verify_url: string;
}> {
  const base = resolveServerApiBaseUrl();
  const secret = getEmailProxySecret();
  if (!secret || isLocalApiBase(base)) {
    throw new Error(
      "חסר EMAIL_PROXY_SECRET או EMAIL_PROXY_DERIVE_FROM ב-Frontend (השתמש ב-DJANGO_SECRET_KEY מ-Backend)",
    );
  }

  const res = await fetch(`${base}/auth/verification-payload/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Email-Proxy-Secret": secret,
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || "לא ניתן ליצור קישור אימות");
  }

  return res.json();
}

async function sendViaResend(
  to: string,
  verifyUrl: string,
  displayName: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL חסרים ב-Frontend");
  }

  const name = displayName || to.split("@")[0];
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a2d42;">
      <h2 style="color:#c9a84c;">שלום ${name},</h2>
      <p>תודה שנרשמת ל-Mandeles.co.il. כדי להשלים את ההרשמה, אנא אמת את כתובת האימייל שלך:</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}"
           style="background:linear-gradient(135deg,#c9a84c,#e8c870);color:#0d1b2a;
                  padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
          אימות אימייל
        </a>
      </p>
      <p style="font-size:12px;color:#8aaabe;">אם לא נרשמת לאתר, ניתן להתעלם מהודעה זו.</p>
    </div>
  `;

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "אימות כתובת אימייל — Mandeles.co.il",
      html,
    }),
  });

  if (!res.ok) {
    throw new Error("שליחת האימייל נכשלה — בדוק דומיין מאומת ב-Resend");
  }
}

/** Try backend resend; fall back to Frontend Resend + verification payload. */
export async function sendVerificationEmail(email: string): Promise<void> {
  const base = resolveServerApiBaseUrl();

  if (!isLocalApiBase(base)) {
    try {
      const res = await fetch(`${base}/auth/resend-verification/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
      if (res.ok) return;
    } catch {
      /* try frontend path */
    }
  }

  if (!resendFromFrontend()) {
    throw new Error(
      "הוסף ב-Railway → Frontend: RESEND_API_KEY, RESEND_FROM_EMAIL, EMAIL_PROXY_DERIVE_FROM=${{eloquent-perfection.DJANGO_SECRET_KEY}}",
    );
  }

  const payload = await fetchVerificationPayload(email);
  await sendViaResend(payload.to, payload.verify_url, payload.display_name);
}
