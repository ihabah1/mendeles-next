/** Google Analytics 4 — production only, no hardcoded measurement ID. */

export function resolveGaMeasurementId(): string {
  if (typeof window !== "undefined" && window.__GA_MEASUREMENT_ID__) {
    return window.__GA_MEASUREMENT_ID__;
  }
  return (
    process.env.GA_MEASUREMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    ""
  );
}

/** @deprecated Use resolveGaMeasurementId() */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export function isGaEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  return resolveGaMeasurementId().length > 0;
}

export function pageview(url: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const measurementId = resolveGaMeasurementId();
  if (!measurementId) return;
  window.gtag("config", measurementId, { page_path: url });
}

export type GaEventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: GaEventParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const measurementId = resolveGaMeasurementId();
  if (!measurementId) return;
  window.gtag("event", eventName, params);
}
