import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const states = new Map<string, number>();

export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(32).toString("hex");
  states.set(state, Date.now());
  for (const [k, v] of states) { if (Date.now() - v > 600000) states.delete(k); }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const params = new URLSearchParams({
    client_id:     process.env.APPLE_CLIENT_ID!,
    redirect_uri:  `${siteUrl}/api/auth/apple/callback`,
    response_type: "code id_token",
    scope:         "name email",
    response_mode: "form_post",
    state,
  });
  const res = NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  res.cookies.set("a_state", state, { httpOnly: true, secure: true, sameSite: "none", maxAge: 600 });
  return res;
}

export { states };
