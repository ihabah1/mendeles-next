import { NextRequest, NextResponse } from "next/server";

import {
  apiConfigErrorHebrew,
  isLocalApiBase,
  resolveProxyApiBaseUrl,
  resolveServerApiBaseUrl,
} from "@/lib/api/server-backend-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

function fetchErrorHint(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || /timeout/i.test(err.message)) {
      return "timeout — השרת לא הגיב בזמן (ייתכן שה-backend בתהליך עלייה מחדש)";
    }
    if (/ECONNREFUSED|fetch failed|ENOTFOUND|ECONNRESET/i.test(err.message)) {
      return "connection refused — ה-backend כנראה לא רץ או שה-URL שגוי";
    }
    return err.message;
  }
  return "unknown error";
}

async function fetchBackend(
  target: string,
  init: RequestInit,
  timeoutMs: number,
  attempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(target, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastErr = err;
      if (i + 1 < attempts) {
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const publicBase = resolveServerApiBaseUrl();
  if (isLocalApiBase(publicBase)) {
    return NextResponse.json({ detail: apiConfigErrorHebrew() }, { status: 502 });
  }

  const base = resolveProxyApiBaseUrl();
  const { path = [] } = await ctx.params;
  const suffix = path.length ? `/${path.join("/")}/` : "/";
  const target = `${base}${suffix}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
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

  const isHeavyDownload =
    req.method === "GET" &&
    (suffix.includes("/scan") || suffix.includes("/invoice"));

  const timeoutMs = isHeavyDownload ? 120_000 : 60_000;

  try {
    const res = await fetchBackend(target, init, timeoutMs);
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      responseHeaders.set(key, value);
    });

    const contentType = res.headers.get("content-type") || "";
    const streamBinary =
      isHeavyDownload ||
      contentType.includes("pdf") ||
      contentType.includes("octet-stream");

    if (streamBinary && res.body) {
      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });
    }

    const body = await res.arrayBuffer();
    if (body.byteLength > 0) {
      responseHeaders.set("content-length", String(body.byteLength));
    }
    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const hint = fetchErrorHint(err);
    return NextResponse.json(
      {
        detail: `לא ניתן להגיע ל-backend: ${publicBase}`,
        hint,
        proxyTarget: base !== publicBase ? base : undefined,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
