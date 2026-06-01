/**
 * API base URL resolution.
 *
 * - Build time: NEXT_PUBLIC_API_BASE_URL (baked into client bundle)
 * - Runtime (Railway): API_BASE_URL via /api/runtime-config (no rebuild needed)
 */
const DEFAULT = "http://localhost:8000/api";

function normalize(url: string): string {
  return url.replace(/\/$/, "");
}

function envBase(): string | undefined {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return v ? normalize(v) : undefined;
}

function isLocalUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/** Sync fallback for SSR / first paint (may be localhost in production until resolved). */
export const API_BASE_URL = envBase() || DEFAULT;

export const AUTH_ENDPOINTS = {
  login: "/auth/login/",
  register: "/auth/register/",
  logout: "/auth/logout/",
  refresh: "/auth/refresh/",
  verify: "/auth/verify/",
  me: "/auth/me/",
} as const;

let resolved: string | null = null;
let pending: Promise<string> | null = null;

export async function resolveApiBaseUrl(): Promise<string> {
  if (resolved) return resolved;
  if (pending) return pending;

  pending = (async () => {
    const baked = envBase();
    if (baked && !isLocalUrl(baked)) {
      resolved = baked;
      return resolved;
    }

    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/runtime-config", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { apiBaseUrl?: string };
          if (data.apiBaseUrl) {
            resolved = normalize(data.apiBaseUrl);
            return resolved;
          }
        }
      } catch {
        /* use fallback */
      }
    }

    resolved = baked || DEFAULT;
    return resolved;
  })();

  return pending;
}

/** Call once on app load so the first API request uses the correct backend URL. */
export function primeApiBaseUrl(): Promise<string> {
  return resolveApiBaseUrl();
}
