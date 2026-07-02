import { NextResponse } from "next/server";

/** Lightweight liveness probe for Railway / load balancers — no backend or SSR. */
export function GET() {
  return NextResponse.json({ status: "ok", service: "mendeles-frontend" }, { status: 200 });
}
