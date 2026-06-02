import { NextResponse } from "next/server";

/** Lightweight deploy probe — compare `commit` after Railway redeploy. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    builtAt: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
  });
}

export const dynamic = "force-dynamic";
