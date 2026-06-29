import { NextRequest, NextResponse } from "next/server";

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes("railway.app") || trimmed.includes("railway.internal")) {
    return trimmed.includes("railway.internal") ? `http://${trimmed}` : `https://${trimmed}`;
  }
  return `http://${trimmed}`;
}

/** Resolve Django backend base URL at runtime (Railway private network preferred). */
export function backendBase(): string {
  const candidates = [
    process.env.API_URL,
    process.env.BACKEND_INTERNAL_URL,
    process.env.BACKEND_URL,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    if (!isLocalhost(raw)) return normalizeUrl(raw);
  }

  const privateHost = process.env.BACKEND_PRIVATE_HOST;
  const privatePort = process.env.BACKEND_PORT || process.env.BACKEND_PRIVATE_PORT;
  if (privateHost && privatePort) {
    return `http://${privateHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}:${privatePort}`;
  }

  const publicHost = process.env.BACKEND_PUBLIC_HOST;
  if (publicHost) {
    return normalizeUrl(publicHost);
  }

  if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID) {
    // Known production backend — fallback when Railway service refs are not wired yet.
    return "https://eloquent-perfection-production-de3d.up.railway.app";
  }

  return "http://localhost:8000";
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
