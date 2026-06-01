import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const states = new Map<string, number>();

export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(32).toString("hex");
  states.set(state, Date.now());
  // clean old states
  for (const [k, v] of states) { if (Date.now() - v > 600000) states.delete(k); }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  return res;
}

export { states };
