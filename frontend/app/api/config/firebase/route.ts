import { NextResponse } from "next/server";

/** Public Firebase web config — read at runtime from Railway env (not only build-time). */
export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (!apiKey || !projectId) {
    return NextResponse.json({
      configured: false,
      hint: "הוסף NEXT_PUBLIC_FIREBASE_* ב-Railway (שירות Frontend) ועשה Redeploy",
    });
  }

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

  return NextResponse.json({
    configured: true,
    config: {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
      messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || undefined,
      ...(measurementId ? { measurementId } : {}),
    },
  });
}
