import { NextRequest, NextResponse } from "next/server";
import { states } from "../route";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code     = form.get("code") as string;
  const state    = form.get("state") as string;
  const idToken  = form.get("id_token") as string;
  const userJson = form.get("user") as string | null;
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL!;

  const stateData = states.get(state || "");
  if (!code || !stateData || Date.now() - stateData > 600000)
    return NextResponse.redirect(`${siteUrl}/auth?error=apple_state`);
  states.delete(state);

  let claims: { email?: string; sub?: string };
  try {
    claims = jwt.decode(idToken) as { email?: string; sub?: string };
  } catch {
    return NextResponse.redirect(`${siteUrl}/auth?error=apple_decode`);
  }

  const email     = claims.email?.toLowerCase();
  const sub       = claims.sub || "";
  let name        = email || sub;

  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      const fn = u?.name?.firstName || "";
      const ln = u?.name?.lastName  || "";
      name = `${fn} ${ln}`.trim() || name;
    } catch {}
  }

  let user = await prisma.user.findFirst({
    where: { OR: [{ provider: "apple", providerId: sub }, ...(email ? [{ email }] : [])] },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { name, email: email || null, provider: "apple", providerId: sub, emailVerified: true },
    });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  }

  const token = await signToken({ sub: user.id, email: user.email, phone: user.phone });
  const res = NextResponse.redirect(siteUrl);
  res.cookies.set("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 86400 });
  return res;
}
