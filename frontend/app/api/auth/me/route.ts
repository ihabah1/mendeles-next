import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  return NextResponse.json({
    id: user.id, name: user.name, email: user.email,
    phone: user.phone, provider: user.provider,
    createdAt: user.createdAt, lastLogin: user.lastLogin,
  });
}
