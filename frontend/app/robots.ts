import type { MetadataRoute } from "next";
import { backendBase } from "@/lib/api/backend-url";
import { generateRobotsTxt } from "@/lib/seo/robots";
import { DEFAULT_SEO_SETTINGS, fetchPublicSEO } from "@/lib/seo/settings";

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

function parseRobots(content: string): MetadataRoute.Robots {
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
      sitemap = trimmed.replace("Sitemap:", "").trim();
    }
  }

  if (!rules.length) rules.push({ userAgent: "*", disallow: "/" });
  return { rules, sitemap };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const remote = await fetchRobotsContent();
  if (remote) return parseRobots(remote);

  const bundle = await fetchPublicSEO();
  const settings = bundle?.settings ?? DEFAULT_SEO_SETTINGS;
  const content = generateRobotsTxt(settings.canonical_base_url, settings.robots_policy);
  return parseRobots(content);
}
