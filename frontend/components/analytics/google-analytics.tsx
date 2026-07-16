"use client";

import { useEffect } from "react";

type AnalyticsConfig = {
  configured?: boolean;
  measurementId?: string | null;
};

export function GoogleAnalytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let cancelled = false;

    async function loadAnalytics() {
      const response = await fetch("/api/config/analytics", { cache: "no-store" });
      if (!response.ok) return;
      const config = (await response.json()) as AnalyticsConfig;
      const measurementId = config.measurementId?.trim();
      if (cancelled || !config.configured || !measurementId) return;
      if (document.getElementById("google-analytics-script")) return;

      const script = document.createElement("script");
      script.id = "google-analytics-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      const init = document.createElement("script");
      init.id = "google-analytics-init";
      const idJson = JSON.stringify(measurementId);
      init.text = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
window.__GA_MEASUREMENT_ID__ = ${idJson};
gtag('js', new Date());
gtag('config', ${idJson});
`;
      document.head.appendChild(init);
    }

    loadAnalytics().catch(() => {
      // Analytics must never affect page rendering.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
