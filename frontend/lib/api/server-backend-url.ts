/** Resolve Django API base URL on the server (Railway / Node). */
export function resolveServerApiBaseUrl(): string {
  const direct =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");

  const backend = process.env.BACKEND_URL?.trim();
  if (backend) {
    const root = backend.replace(/\/$/, "");
    return root.endsWith("/api") ? root : `${root}/api`;
  }

  return "http://localhost:8000/api";
}

export function isLocalApiBase(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export function apiConfigErrorHebrew(): string {
  return "שירת ה-API לא מוגדר. ב-Railway → שירות Frontend → Variables → הוסף API_BASE_URL=https://<backend-url>/api";
}
