import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Runtime API URL for the browser (set API_BASE_URL on Railway — no rebuild needed). */
export async function GET() {
  const apiBaseUrl =
    process.env.API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8000/api";

  return NextResponse.json({ apiBaseUrl });
}
