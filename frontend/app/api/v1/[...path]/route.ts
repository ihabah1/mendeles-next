import { NextRequest, NextResponse } from "next/server";

function backendBase(): string {
  const raw = (
    process.env.API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8000"
  ).trim();

  const withoutTrailingSlash = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }
  if (withoutTrailingSlash.includes("railway.app")) {
    return `https://${withoutTrailingSlash}`;
  }
  return `http://${withoutTrailingSlash}`;
}

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

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      responseHeaders.append(key, value);
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("api_proxy_error", { target, error });
    return NextResponse.json(
      {
        error: {
          code: "upstream_error",
          message: "Backend unavailable",
          details: { target },
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
