import { NextRequest, NextResponse } from "next/server";

import {
  apiConfigErrorHebrew,
  isLocalApiBase,
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

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const base = resolveServerApiBaseUrl();
  if (isLocalApiBase(base)) {
    return NextResponse.json({ detail: apiConfigErrorHebrew() }, { status: 502 });
  }

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

  try {
    const res = await fetch(target, {
      ...init,
      signal: AbortSignal.timeout(isHeavyDownload ? 120_000 : 45_000),
    });
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
  } catch {
    return NextResponse.json(
      { detail: `לא ניתן להגיע ל-backend: ${base}` },
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
