import type { MetadataRoute } from "next";
import { backendBase } from "@/lib/api/backend-url";
import { generateRobotsTxt } from "@/lib/seo/robots";
import { DEFAULT_SEO_SETTINGS, fetchPublicSEO } from "@/lib/seo/settings";
import { getSiteUrl, isLocalSiteUrl, isProductionRuntime, sanitizeSeoUrl } from "@/lib/seo/site-url";

async function fetchRobotsContent(): Promise<string | null> {
  try {
    const res = await fetch(`${backendBase()}/api/v1/seo/robots/`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { content: string };
      return data.content;
    }
  } catch {
    return null;
  }
  return null;
}

function parseRobots(content: string, baseUrl: string): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [];
  let sitemap: string | undefined;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Disallow:")) {
      const path = trimmed.replace("Disallow:", "").trim();
      if (path) rules.push({ userAgent: "*", disallow: path });
    }
    if (trimmed.startsWith("Allow:")) {
      const path = trimmed.replace("Allow:", "").trim();
      if (path) rules.push({ userAgent: "*", allow: path });
    }
    if (trimmed.startsWith("Sitemap:")) {
      sitemap = sanitizeSeoUrl(trimmed.replace("Sitemap:", "").trim(), baseUrl);
    }
  }

  if (!rules.length) rules.push({ userAgent: "*", disallow: "/" });
  return { rules, sitemap: sitemap || `${baseUrl}/sitemap.xml` };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const bundle = await fetchPublicSEO();
  const settings = bundle?.settings ?? DEFAULT_SEO_SETTINGS;
  const baseUrl = settings.canonical_base_url || getSiteUrl();

  const remote = await fetchRobotsContent();
  if (remote && !(isProductionRuntime() && isLocalSiteUrl(remote))) {
    return parseRobots(remote, baseUrl);
  }

  const content = generateRobotsTxt(baseUrl, settings.robots_policy);
  return parseRobots(content, baseUrl);
}
