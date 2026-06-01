import { NextRequest, NextResponse } from "next/server";
import { states } from "../route";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const stateData = states.get(state || "");
  if (!code || !stateData || Date.now() - stateData > 600000)
    return NextResponse.redirect(`${siteUrl}/auth?error=google_state`);
  states.delete(state!);

  // Exchange code for token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${siteUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return NextResponse.redirect(`${siteUrl}/auth?error=google_token`);

  // Get user info
  const uiRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const ui = await uiRes.json();
  const email = ui.email?.toLowerCase();
  const name = ui.name || email;
  const providerId = ui.sub;

  // Find or create user
  let user = await prisma.user.findFirst({
    where: { OR: [{ provider: "google", providerId }, ...(email ? [{ email }] : [])] },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email, provider: "google", providerId, emailVerified: true },
    });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  }

  const token = await signToken({ sub: user.id, email: user.email, phone: user.phone });
  const res = NextResponse.redirect(siteUrl);
  res.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400 });
  return res;
}
