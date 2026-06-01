import type { NextRequest } from "next/server";

/** Public site URL for OAuth redirect_uri. */
export function resolveSiteUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  );
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export const GOOGLE_OAUTH_ERRORS: Record<string, string> = {
  google_not_configured:
    "כניסה עם Google לא מוגדרת. הגדר GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET ב-Railway.",
  google_state: "שגיאת אבטחה בהתחברות Google. נסה שוב.",
  google_token: "Google לא החזיר token. נסה שוב.",
  google_login: "יצירת חשבון ב-Django נכשלה. נסה שוב.",
};
