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
};

export type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  role_assignments: Array<{ id: string; slug: string; name: string }>;
  created_at: string;
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
  list: () => apiFetch<{ results: UserRow[] }>("/api/v1/users/", { headers: authHeaders() }),
  invite: (data: { email: string; first_name: string; last_name: string; role_slug: string }) =>
    apiFetch<{ id: string; email: string }>("/api/v1/users/invite/", {
      method: "POST",
      headers: authHeaders(),
      json: data,
    }),
  update: (id: string, data: Partial<Pick<UserRow, "first_name" | "last_name" | "is_active">>) =>
    apiFetch<UserRow>(`/api/v1/users/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      json: data,
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/v1/users/${id}/`, { method: "DELETE", headers: authHeaders() }),
  assignRole: (id: string, role_slug: string) =>
    apiFetch<{ message: string }>(`/api/v1/users/${id}/roles/`, {
      method: "POST",
      headers: authHeaders(),
      json: { role_slug },
    }),
  removeRole: (id: string, roleId: string) =>
    apiFetch<void>(`/api/v1/users/${id}/roles/${roleId}/`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
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

export type SEOSettings = {
  site_name: string;
  default_title: string;
  default_description: string;
  default_keywords: string;
  default_author: string;
  default_language: string;
  robots_policy: string;
  canonical_base_url: string;
  default_og_image: string;
  default_twitter_image: string;
  organization_name: string;
  organization_logo: string;
  organization_url: string;
};

export type SEOValidationReport = {
  valid: boolean;
  score: number;
  issues: Array<{ code: string; severity: string; message: string }>;
};

export type SEOStatus = {
  global: SEOValidationReport & { settings?: SEOSettings };
  homepage: SEOValidationReport;
  overall_score: number;
  ready_for_production: boolean;
};

export const seoApi = {
  getSettings: () => apiFetch<SEOSettings>("/api/v1/seo/settings/", { headers: authHeaders() }),
  updateSettings: (data: Partial<SEOSettings>) =>
    apiFetch<SEOSettings>("/api/v1/seo/settings/", {
      method: "PATCH",
      headers: authHeaders(),
      json: data,
    }),
  status: () => apiFetch<SEOStatus>("/api/v1/seo/status/", { headers: authHeaders() }),
  validate: (page?: Record<string, unknown>) =>
    apiFetch<SEOValidationReport>("/api/v1/seo/validate/", {
      method: "POST",
      headers: authHeaders(),
      json: page ? { page } : {},
    }),
  generateSlug: (text: string, locale = "he") =>
    apiFetch<{ slug: string }>("/api/v1/seo/slugs/generate/", {
      method: "POST",
      headers: authHeaders(),
      json: { text, locale },
    }),
};

export type ContentPage = {
  id: string;
  title: string;
  slug: string;
  full_path: string;
  locale: string;
  page_type: string;
  status: string;
  published_version: number;
  published_at: string | null;
  created_at: string;
};

export const contentApi = {
  listPages: () =>
    apiFetch<{ results: ContentPage[] }>("/api/v1/content/pages/", { headers: authHeaders() }),
  createPage: (data: { title: string; slug?: string; page_type?: string; locale?: string }) =>
    apiFetch<ContentPage>("/api/v1/content/pages/", {
      method: "POST",
      headers: authHeaders(),
      json: data,
    }),
  publishPage: (id: string, status = "published") =>
    apiFetch<ContentPage>(`/api/v1/content/pages/${id}/publish/`, {
      method: "POST",
      headers: authHeaders(),
      json: { status },
    }),
};

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  source: string | null;
  source_name: string | null;
  landing_page_id: string | null;
  landing_page_path: string | null;
  page_url: string;
  referrer: string;
  created_at: string | null;
  updated_at: string | null;
};

export type LeadDetail = LeadRow & {
  ip_address: string;
  user_agent: string;
  form_id: string | null;
  assigned_to: string | null;
  utm: {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
  };
  activities: Array<{
    id: string;
    activity_type: string;
    payload: Record<string, unknown>;
    actor: string | null;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    body: string;
    author: string | null;
    created_at: string;
  }>;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type LeadListParams = {
  page?: string;
  page_size?: string;
  q?: string;
  status?: string;
  source?: string;
  landing_page_id?: string;
  sort?: string;
  created_after?: string;
  created_before?: string;
};

function leadsQuery(params?: LeadListParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const leadsApi = {
  list: (params?: LeadListParams) =>
    apiFetch<Paginated<LeadRow>>(`/api/v1/leads/${leadsQuery(params)}`, { headers: authHeaders() }),
  get: (id: string) => apiFetch<LeadDetail>(`/api/v1/leads/${id}/`, { headers: authHeaders() }),
  create: (data: Partial<Pick<LeadRow, "name" | "phone" | "email" | "message">>) =>
    apiFetch<LeadDetail>("/api/v1/leads/", {
      method: "POST",
      headers: authHeaders(),
      json: data,
    }),
  update: (id: string, data: Partial<Pick<LeadRow, "name" | "phone" | "email" | "message" | "status">>) =>
    apiFetch<LeadDetail>(`/api/v1/leads/${id}/`, {
      method: "PATCH",
      headers: authHeaders(),
      json: data,
    }),
  remove: (id: string) =>
    apiFetch<void>(`/api/v1/leads/${id}/`, { method: "DELETE", headers: authHeaders() }),
  addNote: (id: string, body: string) =>
    apiFetch<{ id: string; body: string }>(`/api/v1/leads/${id}/notes/`, {
      method: "POST",
      headers: authHeaders(),
      json: { body },
    }),
  statuses: () =>
    apiFetch<{ results: Array<{ value: string; label: string }> }>("/api/v1/leads/statuses/", {
      headers: authHeaders(),
    }),
  exportCsv: async (params?: LeadListParams) => {
    const token = getAccessToken();
    const res = await fetch(`/api/v1/leads/export/${leadsQuery(params)}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },
};
