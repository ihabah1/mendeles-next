import { NextResponse } from "next/server";

import {
  apiConfigErrorHebrew,
  isLocalApiBase,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";

export const dynamic = "force-dynamic";

function backendOrigin(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, "");
}

/** Any HTTP response (including 401) means the server is up. */
function isReachableStatus(status: number): boolean {
  return status > 0 && status < 500;
}

/** Runtime API URL for the browser (set API_BASE_URL on Railway — no rebuild needed). */
export async function GET() {
  const apiBaseUrl = resolveServerApiBaseUrl();
  const configured = !isLocalApiBase(apiBaseUrl);

  let backendReachable = false;
  if (configured) {
    try {
      const res = await fetch(`${backendOrigin(apiBaseUrl)}/`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      backendReachable = isReachableStatus(res.status);
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
