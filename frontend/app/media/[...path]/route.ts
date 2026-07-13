import { NextRequest, NextResponse } from "next/server";
import { backendBase } from "@/lib/api/backend-url";

/** Proxy /media/* to Django so creatives open on mendeles.com without 404. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const rel = (path || []).map(encodeURIComponent).join("/");
  const target = `${backendBase()}/media/${rel}${request.nextUrl.search}`;

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        accept: request.headers.get("accept") || "*/*",
        "user-agent": request.headers.get("user-agent") || "mendeles-media-proxy",
      },
      redirect: "manual",
      cache: "no-store",
    });

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) headers.set("cache-control", cacheControl);
    headers.set("access-control-allow-origin", "*");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    console.error("media_proxy_error", { target, error });
    return NextResponse.json({ error: "Media backend unavailable" }, { status: 502 });
  }
}
