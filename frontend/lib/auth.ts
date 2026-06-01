import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS || "30");

export interface SessionPayload extends JWTPayload {
  sub: string;
  email?: string | null;
  phone?: string | null;
}

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRE_DAYS}d`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.headers.get("authorization")?.replace("Bearer ", "") || req.cookies.get("auth_token")?.value;
  } else {
    const c = await cookies();
    token = c.get("auth_token")?.value;
  }
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.sub) return null;
  const user = await prisma.user.findUnique({ where: { id: parseInt(String(session.sub)) } });
  if (!user || !user.active) return null;
  return user;
}

export function hashPassword(pw: string) { return bcrypt.hash(pw, 12); }
export function checkPassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }
