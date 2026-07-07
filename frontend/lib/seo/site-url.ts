/** Canonical production origin — apex domain, HTTPS, no www. */
export const PRODUCTION_SITE_URL = "https://mendeles.com";

const LOCAL_DEV_SITE_URL = "http://localhost:3000";

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function isLocalSiteUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function isDeployHost(url: string): boolean {
  return /localhost|127\.0\.0\.1|railway\.app|vercel\.app|\.railway\.internal/i.test(url);
}

export function isCanonicalProductionHost(url: string): boolean {
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "mendeles.com";
  } catch {
    return false;
  }
}

export function isProductionRuntime(): boolean {
  const appEnv = (process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT || "").toLowerCase();
  if (appEnv === "development" || appEnv === "staging" || appEnv === "stage") return false;
  if (appEnv === "production" || appEnv === "prod") return true;
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.RAILWAY_ENVIRONMENT === "production") return true;
  return process.env.NODE_ENV === "production";
}

export function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    parsed.hostname = parsed.hostname.replace(/^www\./i, "");
    if (isProductionRuntime() || !isLocalSiteUrl(parsed.hostname)) {
      parsed.protocol = "https:";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** Resolve the public site origin for the current environment. */
export function getSiteUrl(): string {
  if (isProductionRuntime()) {
    const envUrl = readEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL", "FRONTEND_URL");
    const normalized = envUrl ? normalizeSiteUrl(envUrl) : "";
    if (normalized && isCanonicalProductionHost(normalized)) return normalized;
    return PRODUCTION_SITE_URL;
  }

  const candidates = [readEnv("NEXT_PUBLIC_SITE_URL", "SITE_URL", "FRONTEND_URL")].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate);
    if (normalized) return normalized;
  }
  return LOCAL_DEV_SITE_URL;
}

export function resolveSiteUrl(stored?: string): string {
  if (isProductionRuntime()) {
    const normalizedStored = stored ? normalizeSiteUrl(stored) : "";
    if (normalizedStored && isCanonicalProductionHost(normalizedStored)) return normalizedStored;
    return PRODUCTION_SITE_URL;
  }

  const normalizedStored = stored ? normalizeSiteUrl(stored) : "";
  if (normalizedStored && !isLocalSiteUrl(normalizedStored)) return normalizedStored;
  return getSiteUrl();
}

export function absoluteSiteUrl(path: string, base?: string): string {
  const site = (base || getSiteUrl()).replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${site}${normalized}`;
}

/** Rewrite localhost/http URLs to the resolved production base. */
export function sanitizeSeoUrl(url: string, base?: string): string {
  const siteBase = (base || getSiteUrl()).replace(/\/$/, "");
  if (!url) return siteBase;

  const trimmed = url.trim();
  const needsRewrite =
    isLocalSiteUrl(trimmed) ||
    /^http:\/\//i.test(trimmed) ||
    !/^https?:\/\//i.test(trimmed) ||
    (isProductionRuntime() && isDeployHost(trimmed));

  if (needsRewrite) {
    try {
      const parsed = new URL(trimmed, siteBase);
      return `${siteBase}${parsed.pathname}${parsed.search}`;
    } catch {
      return absoluteSiteUrl(trimmed, siteBase);
    }
  }

  if (isProductionRuntime()) {
    return trimmed.replace(/^http:\/\//i, "https://");
  }
  return trimmed;
}
