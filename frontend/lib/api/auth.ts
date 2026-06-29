import { apiFetch } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
  preferred_locale: string;
  email_verified: boolean;
};

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function authHeaders(): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    tenant_name: string;
  }) => apiFetch<{ message: string; user_id: string }>("/api/v1/auth/register/", { method: "POST", json: body }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ access: string; expires_in: number; user: AuthUser }>("/api/v1/auth/login/", {
      method: "POST",
      json: body,
    }),

  refresh: () =>
    apiFetch<{ access: string; expires_in: number }>("/api/v1/auth/refresh/", { method: "POST" }),

  logout: () =>
    apiFetch<void>("/api/v1/auth/logout/", {
      method: "POST",
      headers: authHeaders(),
    }),

  me: () =>
    apiFetch<AuthUser>("/api/v1/auth/me/", {
      headers: authHeaders(),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/verify-email/", { method: "POST", json: { token } }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/forgot-password/", { method: "POST", json: { email } }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/reset-password/", {
      method: "POST",
      json: { token, password },
    }),
};

export const healthApi = {
  check: () =>
    apiFetch<{ status: string; version: string; database: string }>("/api/v1/health/"),
};
