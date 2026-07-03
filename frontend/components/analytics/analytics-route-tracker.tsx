"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { isGaEnabled, pageview } from "@/lib/analytics/gtag";

export function AnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGaEnabled() || !pathname) return;
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}
