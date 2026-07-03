/** Google Analytics 4 — production only, no hardcoded measurement ID. */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export function isGaEnabled(): boolean {
  return process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID.length > 0;
}

export function pageview(url: string): void {
  if (!isGaEnabled() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

export type GaEventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: GaEventParams): void {
  if (!isGaEnabled() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}
