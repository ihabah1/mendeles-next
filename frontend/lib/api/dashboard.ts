import { apiFetch } from "./client";
import { getAccessToken } from "./auth";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type AdminOverview = {
  generated_at: string;
  system: {
    status: string;
    users_total: number;
    users_active: number;
    users_verified: number;
    tenants_total: number;
    tenants_active: number;
    roles_total: number;
    permissions_total: number;
    audit_last_24h: number;
    logins_last_7d: number;
  };
  users_by_role: Array<{ role: string; name: string; count: number }>;
  recent_audit: Array<{
    id: string;
    action: string;
    created_at: string | null;
    user_email: string | null;
    resource_type: string | null;
  }>;
  landing_preview: {
    demo: boolean;
    pages_total: number;
    pages_published: number;
    total_views: number;
    views_today: number;
    leads_total: number;
    conversion_rate: number;
    top_pages: Array<{ name: string; slug: string; views: number }>;
    views_by_day: Array<{ date: string; views: number }>;
  };
};

export type RoleRow = {
  id: string;
  slug: string;
  name: string;
  is_system: boolean;
  permissions?: string[];
};

export const adminApi = {
  overview: () =>
    apiFetch<AdminOverview>("/api/v1/admin/overview/", { headers: authHeaders() }),
};

export const usersApi = {
  list: () => apiFetch<{ results: Array<Record<string, unknown>> }>("/api/v1/users/", { headers: authHeaders() }),
};

export const rolesApi = {
  list: () => apiFetch<{ results: RoleRow[] }>("/api/v1/roles/", { headers: authHeaders() }),
};

export const permissionsApi = {
  list: () =>
    apiFetch<{ results: Array<{ codename: string; module: string; description: string }> }>(
      "/api/v1/permissions/",
      { headers: authHeaders() },
    ),
};

export const settingsApi = {
  get: () => apiFetch<Record<string, string>>("/api/v1/settings/", { headers: authHeaders() }),
  update: (data: Record<string, string>) =>
    apiFetch<Record<string, string>>("/api/v1/settings/", {
      method: "PATCH",
      headers: authHeaders(),
      json: data,
    }),
};

export const auditApi = {
  list: () =>
    apiFetch<{ results: Array<Record<string, unknown>> }>("/api/v1/audit-logs/", {
      headers: authHeaders(),
    }),
};
