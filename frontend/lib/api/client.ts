/**
 * Axios instance shared by every API service.
 *
 * - Attaches the Django JWT access token to each request.
 * - Transparently refreshes an expired access token (once) on a 401 and
 *   replays the original request.
 * - Clears the session and notifies listeners when refresh fails.
 */
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import {
  API_BASE_URL,
  AUTH_ENDPOINTS,
  resetApiBaseCache,
  resolveApiBaseUrl,
} from "./config";
import { tokenStore } from "./tokens";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** AllowAny auth routes — never send a stale JWT (causes "User not found"). */
const PUBLIC_AUTH_PATHS = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.register,
  AUTH_ENDPOINTS.verifyEmail,
  AUTH_ENDPOINTS.resendVerification,
  AUTH_ENDPOINTS.sendPhoneOtp,
  AUTH_ENDPOINTS.verifyPhone,
  AUTH_ENDPOINTS.resendPhoneOtp,
  AUTH_ENDPOINTS.smsStatus,
  AUTH_ENDPOINTS.firebaseStatus,
] as const;

function isPublicAuthRequest(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

/** Called when the session can no longer be recovered (refresh failed). */
let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(handler: (() => void) | null) {
  onAuthFailure = handler;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  config.baseURL = await resolveApiBaseUrl();
  const url = config.url ?? "";
  if (!isPublicAuthRequest(url)) {
    const token = tokenStore.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Single-flight refresh: queue requests while a refresh is in progress ──────
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    // Use a bare axios call so we don't recurse through these interceptors.
    const base = await resolveApiBaseUrl();
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${base}${AUTH_ENDPOINTS.refresh}`,
      { refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    tokenStore.set(data.access, data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isAuthRoute =
      url.includes(AUTH_ENDPOINTS.refresh) ||
      url.includes(AUTH_ENDPOINTS.login) ||
      isPublicAuthRequest(url);

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newAccess = await refreshing;
      refreshing = null;

      if (newAccess) {
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original as AxiosRequestConfig);
      }

      tokenStore.clear();
      onAuthFailure?.();
    }

    return Promise.reject(error);
  },
);

/** Maps common English API / Firebase messages to Hebrew for the UI. */
export function translateApiMessage(message: string): string {
  const m = message.trim();
  if (!m) return m;
  const lower = m.toLowerCase();
  if (lower.includes("no active account")) {
    return "אימייל או סיסמה שגויים";
  }
  if (
    lower === "user not found" ||
    lower.includes("auth/user-not-found") ||
    lower.includes("user-not-found")
  ) {
    return "לא נמצא חשבון — בדוק אימייל או הירשם מחדש";
  }
  if (lower === "not found" || lower === "not found.") {
    return "הבקשה לא נמצאה — נסה שוב או פנה לתמיכה";
  }
  if (
    lower.includes("already exists") ||
    lower.includes("כבר רשומ") ||
    lower.includes("קיימת כבר") ||
    lower.includes("קיים כבר")
  ) {
    return "כתובת האימייל כבר רשומה. אם לא אימתת — בדוק ספאם; אחרת לחץ «התחבר».";
  }
  if (lower.includes("user is inactive") || lower.includes("user_inactive")) {
    return "החשבון ממתין לאימות טלפון — נסה שוב לאחר פריסת השרת.";
  }
  return m;
}

/** Extracts a human-friendly error message from a DRF error response. */
export function extractApiError(error: unknown, fallback = "אירעה שגיאה"): string {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return translateApiMessage(error.message) || fallback;
  }
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "השרת לא מגיב בזמן. ודא שה-backend (Django) רץ.";
    }
    if (!error.response) {
      resetApiBaseCache();
      const onLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      if (onLocalhost) {
        return "לא ניתן להתחבר לשרת Django (8000). הפעל: cd backend && python manage.py runserver";
      }
      return (
        "שירת ה-API לא זמין. ודא ב-Railway → Frontend → Variables: " +
        "API_BASE_URL=https://eloquent-perfection-production-de3d.up.railway.app/api " +
        "ואז Redeploy. בדיקה: פתח /api/runtime-config בדפדפן."
      );
    }
    const status = error.response.status;
    if (status === 502 || status === 503) {
      const data = error.response.data as { detail?: string } | undefined;
      if (data?.detail) return String(data.detail);
      return "ה-Frontend לא מצליח להגיע ל-Backend. בדוק API_BASE_URL בשירות Frontend.";
    }
    const data = error.response.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.detail === "string") {
        return translateApiMessage(data.detail);
      }
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val) && val.length) {
          return translateApiMessage(String(val[0]));
        }
        if (typeof val === "string") return translateApiMessage(val);
      }
    }
    return translateApiMessage(error.message || "") || fallback;
  }
  return fallback;
}

export default api;
