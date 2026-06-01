import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import {
  isGoogleOAuthConfigured,
  resolveSiteUrl,
} from "@/lib/auth/google-oauth";

export async function GET(req: NextRequest) {
  const siteUrl = resolveSiteUrl(req);

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${siteUrl}/auth?error=google_not_configured`,
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
  res.cookies.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
