function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes("railway.app") || trimmed.includes("railway.internal")) {
    return trimmed.includes("railway.internal") ? `http://${trimmed}` : `https://${trimmed}`;
  }
  return `http://${trimmed}`;
}

/** Resolve Django backend base URL at runtime (Railway private network preferred). */
export function backendBase(): string {
  const candidates = [
    process.env.API_URL,
    process.env.BACKEND_INTERNAL_URL,
    process.env.BACKEND_URL,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    if (!isLocalhost(raw)) return normalizeUrl(raw);
  }

  const privateHost = process.env.BACKEND_PRIVATE_HOST;
  const privatePort = process.env.BACKEND_PORT || process.env.BACKEND_PRIVATE_PORT;
  if (privateHost && privatePort) {
    return `http://${privateHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}:${privatePort}`;
  }

  const publicHost = process.env.BACKEND_PUBLIC_HOST;
  if (publicHost) {
    return normalizeUrl(publicHost);
  }

  if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID) {
    return "https://eloquent-perfection-production-de3d.up.railway.app";
  }

  return "http://localhost:8000";
}
