import { NextRequest, NextResponse } from "next/server";
import { backendBase } from "@/lib/api/backend-url";

async function proxy(request: NextRequest) {
  const target = `${backendBase()}${request.nextUrl.pathname}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  try {
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      redirect: "manual",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      responseHeaders.append(key, value);
    });

    // If Django/Gunicorn returns HTML 5xx, convert to JSON so the UI can show a clear error.
    if (upstream.status >= 500 && contentType.includes("text/html")) {
      const html = await upstream.text();
      console.error("api_proxy_upstream_html_error", {
        target,
        status: upstream.status,
        snippet: html.slice(0, 400),
      });
      return NextResponse.json(
        {
          error: {
            code: "upstream_html_error",
            message: `שגיאת שרת פנימית מה-backend (${upstream.status})`,
            details: {
              backend: backendBase(),
              path: request.nextUrl.pathname,
              snippet: html.replace(/\s+/g, " ").slice(0, 240),
            },
          },
        },
        { status: upstream.status },
      );
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("api_proxy_error", { target, backend: backendBase(), error });
    return NextResponse.json(
      {
        error: {
          code: "upstream_error",
          message: "Backend unavailable",
          details: { backend: backendBase() },
        },
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
