import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./lib/i18n/routing";
import { isProductionRuntime, PRODUCTION_SITE_URL } from "./lib/seo/site-url";

const intlMiddleware = createMiddleware(routing);
const PRODUCTION_HOST = new URL(PRODUCTION_SITE_URL).host;

function isDeployHost(host: string): boolean {
  return host.endsWith(".railway.app") || host.endsWith(".vercel.app");
}

export default function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();

  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  if (isProductionRuntime() && isDeployHost(host) && !host.startsWith("healthcheck.")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = PRODUCTION_HOST;
    return NextResponse.redirect(url, 301);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(he|en|ar|es|de|zh|fr|it|pt|ru|ja|ko|hi|tr|pl|nl|uk|ro)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
