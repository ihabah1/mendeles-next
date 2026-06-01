import { NextRequest, NextResponse } from "next/server";

import { resolveSiteUrl } from "@/lib/auth/google-oauth";
import { resolveServerApiBaseUrl } from "@/lib/api/server-backend-url";

export async function GET(req: NextRequest) {
  const siteUrl = resolveSiteUrl(req);
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("g_state")?.value;

  const fail = (error: string) => {
    const res = NextResponse.redirect(`${siteUrl}/auth?error=${error}`);
    res.cookies.set("g_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("google_state");
  }

  const redirectUri = `${siteUrl}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return fail("google_token");

  const djangoBase = resolveServerApiBaseUrl();
  const djangoRes = await fetch(`${djangoBase}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: tokens.access_token }),
  });
  const session = await djangoRes.json();
  if (!djangoRes.ok || !session.access) return fail("google_login");

  const hash = new URLSearchParams({
    access: session.access,
    refresh: session.refresh || "",
  }).toString();

  const res = NextResponse.redirect(`${siteUrl}/auth/oauth#${hash}`);
  res.cookies.set("g_state", "", { maxAge: 0, path: "/" });
  return res;
}
