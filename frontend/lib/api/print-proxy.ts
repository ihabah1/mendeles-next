import { NextRequest, NextResponse } from "next/server";

import {
  apiConfigErrorHebrew,
  isLocalApiBase,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";

export async function proxyToDjangoPrint(
  req: NextRequest,
  djangoPath: string,
): Promise<NextResponse> {
  const base = resolveServerApiBaseUrl();
  if (isLocalApiBase(base)) {
    return NextResponse.json({ detail: apiConfigErrorHebrew() }, { status: 502 });
  }

  const target = `${base}/print/${djangoPath}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "host" || k === "connection" || k === "content-length") return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, { ...init, signal: AbortSignal.timeout(60_000) });
    const body = await res.arrayBuffer();
    const out = new NextResponse(body, { status: res.status });
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      out.headers.set(key, value);
    });
    return out;
  } catch {
    return NextResponse.json({ error: "Backend לא זמין" }, { status: 502 });
  }
}
