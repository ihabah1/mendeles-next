import { DEFAULT_SEO_SETTINGS } from "./settings";

export function detectEnvironment(): "development" | "staging" | "production" {
  const env = (process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || "").toLowerCase();
  if (env === "production" || env === "prod") return "production";
  if (env === "staging" || env === "stage") return "staging";
  if (process.env.NODE_ENV === "development") return "development";
  return "production";
}

export function generateRobotsTxt(baseUrl?: string, robotsPolicy?: string): string {
  const env = detectEnvironment();
  const base = (baseUrl || DEFAULT_SEO_SETTINGS.canonical_base_url).replace(/\/$/, "");
  const sitemapUrl = `${base}/sitemap.xml`;

  if (env === "development" || env === "staging") {
    return `User-agent: *\nDisallow: /\n\n# environment: ${env}\n`;
  }

  const policy = robotsPolicy || DEFAULT_SEO_SETTINGS.robots_policy;
  const lines = ["User-agent: *"];

  if (policy.includes("noindex")) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
    lines.push("Disallow: /dashboard/");
    lines.push("Disallow: /api/");
  }

  lines.push("", `Sitemap: ${sitemapUrl}`);
  return lines.join("\n");
}
