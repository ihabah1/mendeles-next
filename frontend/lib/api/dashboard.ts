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
    landing_pages_total: number;
    landing_pages_published: number;
    landing_pages_draft: number;
    leads_total: number;
  };
  automation: {
    status: string;
    active_jobs: number;
    scheduled_jobs: number;
    running_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    paused_jobs: number;
    waiting_approval: number;
    queue_size: number;
    upcoming_jobs: number;
    credits_used: number;
    average_runtime_ms: number | null;
    estimated_completion_minutes: number | null;
    workers_total: number;
    workers_busy: number;
    total_jobs: number;
  };
  recent_jobs: Array<{
    id: string;
    name: string;
    status: string;
    job_type: string;
    progress_percent: number;
    created_at: string | null;
  }>;
  users_by_role: Array<{ role: string; name: string; count: number }>;
  recent_audit: Array<{
    id: string;
    action: string;
    created_at: string | null;
    user_email: string | null;
    resource_type: string | null;
  }>;
  recent_logins: Array<{
    id: string;
    user_email: string | null;
    ip_address: string | null;
    created_at: string | null;
  }>;
  recent_landing_pages: Array<{
    id: string;
    title: string;
    status: string;
    full_path: string;
    tenant_name: string;
    published_at: string | null;
    updated_at: string | null;
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

export type AutomationJobRow = {
  id: string;
  name: string;
  job_type: string;
  status: string;
  priority: string;
  progress_percent: number;
  queue_id: string;
  requires_approval: boolean;
  auto_publish_enabled: boolean;
  retry_count: number;
  max_retries: number;
  error_message: string;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  completed_tasks: number;
  failed_tasks: number;
  remaining_tasks: number;
  total_tasks: number;
};

export type AutomationJobDetail = AutomationJobRow & {
  config: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  executions: Array<Record<string, unknown>>;
  logs: Array<{ id: string; level: string; message: string; created_at: string }>;
};

export type AutomationStats = AdminOverview["automation"];

export const automationApi = {
  dashboard: () =>
    apiFetch<{ stats: AutomationStats; recent_jobs: AutomationJobRow[] }>(
      "/api/v1/automation/dashboard/",
      { headers: authHeaders() },
    ),
  list: (params?: { status?: string; job_type?: string; q?: string; page?: string }) => {
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
      }
    }
    const qs = sp.toString();
    return apiFetch<Paginated<AutomationJobRow>>(`/api/v1/automation/${qs ? `?${qs}` : ""}`, {
      headers: authHeaders(),
    });
  },
  get: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/`, { headers: authHeaders() }),
  create: (data: { name: string; job_type: string; priority?: string; config?: Record<string, unknown> }) =>
    apiFetch<AutomationJobDetail>("/api/v1/automation/", {
      method: "POST",
      headers: authHeaders(),
      json: data,
    }),
  jobTypes: () =>
    apiFetch<{
      results: Array<{ value: string; label: string }>;
      priorities: Array<{ value: string; label: string }>;
      statuses: Array<{ value: string; label: string }>;
    }>("/api/v1/automation/job-types/", { headers: authHeaders() }),
  pause: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/pause/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  resume: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/resume/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  cancel: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/cancel/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  retry: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/retry/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  approve: (id: string) =>
    apiFetch<AutomationJobDetail>(`/api/v1/automation/${id}/approve/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  workers: () =>
    apiFetch<{ results: Array<Record<string, unknown>> }>("/api/v1/automation/workers/", {
      headers: authHeaders(),
    }),
};

export type GoogleServiceStatus = {
  service_type: string;
  status: string;
  connected_account: string | null;
  property_id: string | null;
  property_label: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  last_error: string | null;
  sync_enabled: boolean;
  oauth_configured: boolean;
  setup_instructions: string[];
};

export type GoogleIntegrationDashboard = {
  oauth_platform_configured: boolean;
  setup_instructions: string[];
  services: GoogleServiceStatus[];
  recent_syncs: Array<{
    id: string;
    service_type: string;
    sync_status: string;
    retrieved_at: string;
    error_message: string | null;
  }>;
};

export const integrationsApi = {
  googleDashboard: () =>
    apiFetch<GoogleIntegrationDashboard>("/api/v1/integrations/google/", { headers: authHeaders() }),
  googleConnect: (service_type: string) =>
    apiFetch<{ auth_url?: string; message?: string; setup_instructions?: string[] }>(
      "/api/v1/integrations/google/connect/",
      { method: "POST", headers: authHeaders(), json: { service_type } },
    ),
  googleDisconnect: (service_type: string) =>
    apiFetch<{ ok: boolean }>("/api/v1/integrations/google/disconnect/", {
      method: "POST",
      headers: authHeaders(),
      json: { service_type },
    }),
  googleProperties: (service_type: string) =>
    apiFetch<{ properties: Array<{ id: string; label: string; is_active: boolean }> }>(
      `/api/v1/integrations/google/properties/?service_type=${service_type}`,
      { headers: authHeaders() },
    ),
  googleSelectProperty: (service_type: string, property_id: string) =>
    apiFetch<GoogleServiceStatus>("/api/v1/integrations/google/properties/select/", {
      method: "POST",
      headers: authHeaders(),
      json: { service_type, property_id },
    }),
  googleSync: (service_type: string, config: Record<string, unknown> = {}) =>
    apiFetch<{ job_id: string; status: string }>("/api/v1/integrations/google/sync/", {
      method: "POST",
      headers: authHeaders(),
      json: { service_type, ...config },
    }),
  googleSyncHistory: (service_type?: string) =>
    apiFetch<{ results: Array<Record<string, unknown>> }>(
      `/api/v1/integrations/google/sync/history/${service_type ? `?service_type=${service_type}` : ""}`,
      { headers: authHeaders() },
    ),
};

export type AiSeoServiceFlag = {
  id: string;
  status: string;
  configured: boolean;
  connected: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  property_label: string | null;
  requires_action: boolean;
};

export type AiSeoKpi = {
  available: boolean;
  value: number | null;
  change_pct?: number | null;
  total?: number;
  period_days?: number;
};

export type AiSeoDashboard = {
  generated_at: string;
  services: AiSeoServiceFlag[];
  kpis: {
    lead_revenue: AiSeoKpi;
    new_leads: AiSeoKpi;
    organic_clicks: AiSeoKpi;
    impressions: AiSeoKpi;
    page_one_rankings: AiSeoKpi;
  };
  organic: {
    available: boolean;
    reason?: string;
    connection_status?: string;
    last_sync_at?: string;
    series: Array<{ date: string; clicks: number; impressions: number }>;
    summary: Record<string, number | null | undefined>;
  };
  hot_keywords: {
    available: boolean;
    last_sync_at: string | null;
    items: Array<{
      keyword: string;
      source: string;
      volume: number | null;
      trend: string | null;
      clicks?: number;
      position?: number;
    }>;
  };
  automation_tasks: Array<{
    id: string;
    name: string;
    job_type: string;
    status: string;
    progress_percent: number;
    updated_at: string | null;
  }>;
  lead_funnel: {
    available: boolean;
    gsc_connected: boolean;
    stages: Array<{ label: string; value: number }>;
  };
  content_review: {
    available: boolean;
    waiting_count: number;
    items: Array<{
      id: string;
      title: string;
      page_type: string;
      status: string;
      updated_at: string | null;
      full_path: string;
    }>;
  };
  system: {
    database: string;
    workers_total: number;
    workers_busy: number;
    queue_size: number;
    running_jobs: number;
    waiting_approval: number;
  };
  recent_activity: Array<{ id: string; action: string; created_at: string | null; user_email: string | null }>;
  reminders: Array<{ type: string; count: number }>;
};

export const aiSeoApi = {
  dashboard: () => apiFetch<AiSeoDashboard>("/api/v1/ai-seo/dashboard/", { headers: authHeaders() }),
  refresh: (section: "all" | "search_console" | "analytics" | "trends" = "all") =>
    apiFetch<{ queued: Array<Record<string, unknown>>; dashboard: AiSeoDashboard }>(
      "/api/v1/ai-seo/refresh/",
      { method: "POST", headers: authHeaders(), json: { section } },
    ),
  keywordsStudio: () =>
    apiFetch<{ available: boolean; results: Array<Record<string, unknown>>; services: AiSeoServiceFlag[] }>(
      "/api/v1/ai-seo/studio/keywords/",
      { headers: authHeaders() },
    ),
  contentStudio: () =>
    apiFetch<{ available: boolean; services: AiSeoServiceFlag[]; message: string }>(
      "/api/v1/ai-seo/studio/content/",
      { headers: authHeaders() },
    ),
  reviewStudio: () =>
    apiFetch<AiSeoDashboard["content_review"]>("/api/v1/ai-seo/studio/review/", { headers: authHeaders() }),
  workspace: () =>
    apiFetch<AiSeoWorkspace>("/api/v1/ai-seo/workspace/", { headers: authHeaders() }),
  generateWorkspaceBatch: (body: {
    domains: string[];
    keywords?: string[];
    output_types: string[];
    prompt?: string;
    scheduled_at?: string;
    recurrence_interval?: string;
    auto_publish_enabled?: boolean;
    locale?: string;
  }) =>
    apiFetch<{ jobs: AiSeoWorkspaceJob[]; workspace: AiSeoWorkspace }>("/api/v1/ai-seo/workspace/generate/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),
  regenerateWorkspacePage: (body: { page_id: string; feedback: string; keywords?: string[]; domain?: string }) =>
    apiFetch<AiSeoWorkspaceJob>("/api/v1/ai-seo/workspace/regenerate/", {
      method: "POST",
      headers: authHeaders(),
      json: body,
    }),
  publishWorkspacePage: (page_id: string) =>
    apiFetch<AiSeoWorkspaceDraft>("/api/v1/ai-seo/workspace/publish/", {
      method: "POST",
      headers: authHeaders(),
      json: { page_id },
    }),
  publishWorkspaceJob: (jobId: string) =>
    apiFetch<AiSeoWorkspaceJob>(`/api/v1/ai-seo/workspace/jobs/${jobId}/publish/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  deleteWorkspacePage: (pageId: string) =>
    apiFetch<void>(`/api/v1/ai-seo/workspace/pages/${pageId}/delete/`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  runWorkspaceJob: (jobId: string) =>
    apiFetch<AiSeoWorkspaceJob>(`/api/v1/ai-seo/workspace/jobs/${jobId}/run/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  runNextWorkspaceQueueStep: () =>
    apiFetch<{ job: AiSeoWorkspaceJob | null; workspace: AiSeoWorkspace }>("/api/v1/ai-seo/workspace/queue/run-next/", {
      method: "POST",
      headers: authHeaders(),
    }),
  retryWorkspaceStep: (jobId: string, stepId: string) =>
    apiFetch<AiSeoWorkspaceJob>(`/api/v1/ai-seo/workspace/jobs/${jobId}/steps/${stepId}/retry/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  cancelWorkspaceJob: (jobId: string) =>
    apiFetch<AiSeoWorkspaceJob>(`/api/v1/ai-seo/workspace/jobs/${jobId}/cancel/`, {
      method: "POST",
      headers: authHeaders(),
    }),
  deleteWorkspaceJob: (jobId: string) =>
    apiFetch<void>(`/api/v1/ai-seo/workspace/jobs/${jobId}/delete/`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
};

export type AiSeoWorkspaceDomain = { value: string; label: string; keywords: string[] };
export type AiSeoWorkspaceJob = {
  id: string;
  name: string;
  job_type: string;
  status: string;
  progress_percent: number;
  current_step_index: number;
  scheduled_at: string | null;
  created_at: string | null;
  error_message: string | null;
  config: Record<string, unknown>;
  generated_page_id?: string | null;
  function: string;
  current_step_name: string;
  user: string;
  steps: Array<{
    id: string;
    name: string;
    step_type: string;
    status: string;
    error_message: string | null;
    started_at: string | null;
    is_stale: boolean;
    retry_count: number;
    max_retries: number;
  }>;
  logs: Array<{
    id: string;
    level: string;
    message: string;
    created_at: string | null;
  }>;
};
export type AiSeoWorkspaceDraft = {
  id: string;
  title: string;
  page_type: string;
  status: string;
  full_path: string;
  meta_title: string;
  meta_description: string;
  published_at: string | null;
  updated_at: string | null;
  test_url: string;
  source_job_id: string | null;
  blocks: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
  }>;
};
export type AiSeoWorkspace = {
  domains: AiSeoWorkspaceDomain[];
  gemini_configured: boolean;
  jobs: AiSeoWorkspaceJob[];
  drafts: AiSeoWorkspaceDraft[];
};
