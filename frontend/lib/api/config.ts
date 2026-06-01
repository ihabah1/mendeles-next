/**
 * Central API configuration.
 *
 * The base URL of the Django REST backend is read from an environment
 * variable so the frontend can be deployed independently of the backend.
 * Falls back to the local dev server.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

export const AUTH_ENDPOINTS = {
  login: "/auth/login/",
  register: "/auth/register/",
  logout: "/auth/logout/",
  refresh: "/auth/refresh/",
  verify: "/auth/verify/",
  me: "/auth/me/",
} as const;
