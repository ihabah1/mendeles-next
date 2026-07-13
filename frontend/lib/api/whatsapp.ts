import { apiFetch } from "@/lib/api/client";

export type WhatsAppPublicStatus = {
  connected: boolean;
  provider: string;
  message: string;
};

export type WhatsAppDashboardStatus = {
  provider: string;
  configured: boolean;
  connection_status: string;
  instance: string;
  phone_number: string | null;
  qr_status: string;
  health: string;
  last_sync_at: string | null;
  message: string;
  connected: boolean;
  metadata?: Record<string, unknown>;
};

export type WhatsAppHealth = {
  status: string;
  configured: boolean;
  reachable: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type WhatsAppQr = {
  qr_status: string;
  qr_code: string | null;
  expires_at: string | null;
  message: string;
};

export type WhatsAppActionResult = {
  ok: boolean;
  connection_status: string;
  message: string;
  qr_status?: string;
  phone_number?: string | null;
};

export async function fetchWhatsAppPublicStatus(): Promise<WhatsAppPublicStatus> {
  return apiFetch<WhatsAppPublicStatus>("/api/v1/whatsapp/status/");
}

export const whatsappApi = {
  status: () => apiFetch<WhatsAppDashboardStatus>("/api/v1/whatsapp/status/", { headers: authHeaders() }),
  health: () => apiFetch<WhatsAppHealth>("/api/v1/whatsapp/health/", { headers: authHeaders() }),
  connect: () =>
    apiFetch<WhatsAppActionResult>("/api/v1/whatsapp/connect/", {
      method: "POST",
      headers: authHeaders(),
    }),
  disconnect: () =>
    apiFetch<WhatsAppActionResult>("/api/v1/whatsapp/disconnect/", {
      method: "POST",
      headers: authHeaders(),
    }),
  qr: () => apiFetch<WhatsAppQr>("/api/v1/whatsapp/qr/", { headers: authHeaders() }),
  refresh: () =>
    apiFetch<WhatsAppDashboardStatus>("/api/v1/whatsapp/refresh/", {
      method: "POST",
      headers: authHeaders(),
    }),
};

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
