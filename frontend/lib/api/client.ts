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

import { API_BASE_URL, AUTH_ENDPOINTS } from "./config";
import { tokenStore } from "./tokens";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${API_BASE_URL}${AUTH_ENDPOINTS.refresh}`,
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
      url.includes(AUTH_ENDPOINTS.login);

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

/** Extracts a human-friendly error message from a DRF error response. */
export function extractApiError(error: unknown, fallback = "אירעה שגיאה"): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "השרת לא מגיב בזמן. ודא ש-Django רץ על פורט 8000.";
    }
    if (!error.response) {
      return "לא ניתן להתחבר לשרת Django (8000). הפעל: cd backend && python manage.py runserver";
    }
    const data = error.response.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.detail === "string") {
        if (data.detail.includes("No active account")) {
          return "אימייל או סיסמה שגויים";
        }
        return data.detail;
      }
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val) && val.length) return String(val[0]);
        if (typeof val === "string") return val;
      }
    }
    return error.message || fallback;
  }
  return fallback;
}

export default api;
