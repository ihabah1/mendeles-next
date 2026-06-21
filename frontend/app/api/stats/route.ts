import { NextResponse } from "next/server";

export const revalidate = 60;

async function fetchDrawFromBackend() {
  const apiBase =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:8000/api";
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/lotto/draw/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const data = await fetchDrawFromBackend();
  const stats = data?.stats || {};
  const lastDraw = data?.last_draw || null;
  const prizes = data?.prizes || null;

  return NextResponse.json({
    total_users: 0,
    total_orders: stats.total_orders ?? 0,
    last_draw: lastDraw,
    prizes,
    win_stats: stats.win_stats ?? {},
    total_winners: stats.total_winners ?? 0,
    total_prize: stats.total_prize ?? 0,
    next_draw: data?.next_draw ?? null,
    updated_at: data?.updated_at ?? null,
  });
}
