import { NextResponse } from "next/server";

import {
  apiConfigErrorHebrew,
  isLocalApiBase,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";

export const dynamic = "force-dynamic";

/** Runtime API URL for the browser (set API_BASE_URL on Railway — no rebuild needed). */
export async function GET() {
  const apiBaseUrl = resolveServerApiBaseUrl();
  const configured = !isLocalApiBase(apiBaseUrl);

  let backendReachable = false;
  if (configured) {
    try {
      const res = await fetch(`${apiBaseUrl}/`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      backendReachable = res.ok;
    } catch {
      backendReachable = false;
    }
  }

  return NextResponse.json({
    apiBaseUrl,
    configured,
    backendReachable,
    hint: configured
      ? backendReachable
        ? null
        : "Backend URL is set but not responding — check backend service logs."
      : apiConfigErrorHebrew(),
  });
}
