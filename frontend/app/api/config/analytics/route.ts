import { NextResponse } from "next/server";
import { resolveGaMeasurementId } from "@/lib/analytics/gtag";

/** Runtime GA4 config check — verifies Railway GA_MEASUREMENT_ID without rebuilding. */
export async function GET() {
  const measurementId = resolveGaMeasurementId();
  return NextResponse.json({
    configured: Boolean(measurementId),
    measurementId: measurementId || null,
    environment: process.env.NODE_ENV ?? "unknown",
  });
}
