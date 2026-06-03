import { NextResponse } from "next/server";

import {
  isLocalApiBase,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";

export const dynamic = "force-dynamic";

/** Quick connectivity check for Railway / support. */
export async function GET() {
  const apiBase = resolveServerApiBaseUrl();
  const configured = !isLocalApiBase(apiBase);
  const origin = apiBase.replace(/\/api\/?$/, "");

  let proxyOk = false;
  let backendOk = false;
  let proxyDetail = "";
  let backendDetail = "";

  if (configured) {
    try {
      const backendRes = await fetch(`${origin}/`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      backendOk = backendRes.status > 0 && backendRes.status < 500;
      backendDetail = `HTTP ${backendRes.status}`;
    } catch (e) {
      backendDetail = e instanceof Error ? e.message : "fetch failed";
    }

    try {
      const siteOrigin =
        process.env.FRONTEND_URL?.replace(/\/$/, "") ||
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        "";
      const proxyBase = siteOrigin ? `${siteOrigin}/django-api` : "";
      const loginUrl = proxyBase
        ? `${proxyBase}/auth/login/`
        : `${origin}/api/auth/login/`;
      const proxyRes = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "health@check.invalid", password: "x" }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const text = await proxyRes.text();
      proxyOk =
        (proxyRes.status === 401 || proxyRes.status === 400) && text.length > 0;
      proxyDetail = `HTTP ${proxyRes.status}, ${text.length} bytes`;
    } catch (e) {
      proxyDetail = e instanceof Error ? e.message : "fetch failed";
    }
  }

  const ok = configured && backendOk;

  return NextResponse.json(
    {
      ok,
      configured,
      apiBaseUrl: apiBase,
      backend: { ok: backendOk, detail: backendDetail },
      djangoLogin: { ok: proxyOk, detail: proxyDetail },
      fix: !configured
        ? "Set API_BASE_URL on the Frontend service and redeploy."
        : !backendOk
          ? "Backend not responding — check Backend service deploy/logs."
          : null,
    },
    { status: ok ? 200 : 503 },
  );
}
