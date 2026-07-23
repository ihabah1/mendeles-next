import { apiFetch } from "./client";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
  preferred_locale: string;
  email_verified: boolean;
  credits_balance?: number;
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
  }) => apiFetch<{ message: string; user_id: string; verification_email_sent?: boolean }>(
    "/api/v1/auth/register/",
    { method: "POST", json: body },
  ),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ access: string; expires_in: number; user: AuthUser }>("/api/v1/auth/login/", {
      method: "POST",
      json: body,
    }),

  googleStatus: () =>
    apiFetch<{ configured: boolean; redirect_uri?: string }>("/api/v1/auth/google/"),

  googleStart: () =>
    apiFetch<{ auth_url: string; configured: boolean; redirect_uri?: string }>("/api/v1/auth/google/", {
      method: "POST",
    }),

  googleComplete: (body: { ticket?: string; code?: string; state?: string }) =>
    apiFetch<{ access: string; expires_in: number; user: AuthUser }>("/api/v1/auth/google/complete/", {
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

  updateMe: (body: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone" | "preferred_locale">>) =>
    apiFetch<AuthUser>("/api/v1/auth/me/", {
      method: "PATCH",
      headers: authHeaders(),
      json: body,
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>("/api/v1/auth/verify-email/", { method: "POST", json: { token } }),

  resendVerification: (email: string) =>
    apiFetch<{ message: string; verification_email_sent?: boolean }>(
      "/api/v1/auth/resend-verification/",
      { method: "POST", json: { email } },
    ),

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
