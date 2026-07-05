export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    __GA_MEASUREMENT_ID__?: string;
  }
}
