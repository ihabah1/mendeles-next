import { NextResponse } from "next/server";

import { getEmailProxySecret } from "@/lib/email/proxy-secret";

export const dynamic = "force-dynamic";

/** Resend / proxy diagnostics (no secrets). */
export async function GET() {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasFrom = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const proxyReady = Boolean(getEmailProxySecret());
  const configured = hasKey && hasFrom;

  return NextResponse.json({
    configured,
    has_api_key: hasKey,
    has_from_email: hasFrom,
    proxy_secret_ready: proxyReady,
    send_path: configured ? "frontend" : proxyReady ? "frontend-payload-only" : "none",
    hint: configured
      ? null
      : "Railway → Frontend: RESEND_API_KEY, RESEND_FROM_EMAIL, EMAIL_PROXY_DERIVE_FROM=${{eloquent-perfection.DJANGO_SECRET_KEY}}",
  });
}
