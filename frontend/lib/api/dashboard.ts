import { apiFetch } from "./client";
import { getAccessToken } from "./auth";

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const usersApi = {
  list: () => apiFetch<{ results: Array<Record<string, unknown>> }>("/api/v1/users/", { headers: authHeaders() }),
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
