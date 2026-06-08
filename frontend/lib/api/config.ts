/**
 * API base URL resolution.
 *
 * Production (browser): same-origin `/django-api` → Next.js proxy → Django (API_BASE_URL).
 * Local dev: http://localhost:8000/api
 */
const DEFAULT = "http://localhost:8000/api";
const PROXY_PATH = "/django-api";

function normalize(url: string): string {
  return url.replace(/\/$/, "");
}

function envBase(): string | undefined {
  const v =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.API_BASE_URL?.trim();
  return v ? normalize(v) : undefined;
}

function isLocalHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function browserProxyBase(): string | undefined {
  if (typeof window === "undefined" || isLocalHost()) return undefined;
  return `${window.location.origin}${PROXY_PATH}`;
}

/** Sync fallback for SSR. */
export const API_BASE_URL = envBase() || DEFAULT;

/** Django expects trailing slashes on API paths. */
export const AUTH_ENDPOINTS = {
  login: "/auth/login/",
  register: "/auth/register/",
  verifyEmail: "/auth/verify-email/",
  resendVerification: "/auth/resend-verification/",
  smsStatus: "/auth/sms-status/",
  sendPhoneOtp: "/auth/send-phone-otp/",
  verifyPhone: "/auth/verify-phone/",
  resendPhoneOtp: "/auth/resend-phone-otp/",
  firebaseVerifyPhone: "/auth/firebase/verify-phone/",
  firebaseStatus: "/auth/firebase/status/",
  logout: "/auth/logout/",
  refresh: "/auth/refresh/",
  verify: "/auth/verify/",
  me: "/auth/me/",
  changePassword: "/auth/change-password/",
} as const;

let resolved: string | null = null;
let pending: Promise<string> | null = null;

export function resetApiBaseCache(): void {
  resolved = null;
  pending = null;
}

export async function resolveApiBaseUrl(): Promise<string> {
  const proxy = browserProxyBase();
  if (proxy) return proxy;

  if (resolved) return resolved;
  if (pending) return pending;

  pending = (async () => {
    const baked = envBase();
    if (baked && !baked.includes("localhost") && !baked.includes("127.0.0.1")) {
      resolved = baked;
      return resolved;
    }

    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/runtime-config", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { apiBaseUrl?: string };
          if (data.apiBaseUrl && !data.apiBaseUrl.includes("127.0.0.1")) {
            resolved = normalize(data.apiBaseUrl);
            return resolved;
          }
        }
      } catch {
        /* fall through */
      }
    }

    resolved = baked || DEFAULT;
    return resolved;
  })();

  return pending;
}

export function primeApiBaseUrl(): Promise<string> {
  return resolveApiBaseUrl();
}

/** Django server origin for /manage/, /admin/ links (not the /django-api proxy). */
export function apiBaseToOrigin(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/, "");
}

export async function resolveBackendOriginUrl(): Promise<string> {
  if (typeof window === "undefined" || isLocalHost()) {
    return apiBaseToOrigin(envBase() || DEFAULT);
  }

  try {
    const res = await fetch("/api/runtime-config", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { apiBaseUrl?: string };
      if (data.apiBaseUrl && !data.apiBaseUrl.includes("127.0.0.1")) {
        return apiBaseToOrigin(data.apiBaseUrl);
      }
    }
  } catch {
    /* fall through */
  }

  const baked = envBase();
  if (baked && !baked.includes("localhost") && !baked.includes("127.0.0.1")) {
    return apiBaseToOrigin(baked);
  }

  return "http://localhost:8000";
}
