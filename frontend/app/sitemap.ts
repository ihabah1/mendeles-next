import type { MetadataRoute } from "next";
import { backendBase } from "@/lib/api/backend-url";
import { buildStaticSitemapEntries } from "@/lib/seo/sitemap-registry";
import { DEFAULT_SEO_SETTINGS, fetchPublicSEO } from "@/lib/seo/settings";
import { getSiteUrl, sanitizeSeoUrl } from "@/lib/seo/site-url";
import type { SitemapEntry } from "@/lib/seo/types";

async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const base = getSiteUrl();
  try {
    const res = await fetch(`${backendBase()}/api/v1/seo/sitemap/`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as { entries: SitemapEntry[] };
      if (data.entries?.length) {
        return data.entries.map((entry) => ({
          ...entry,
          loc: sanitizeSeoUrl(entry.loc, base),
        }));
      }
    }
  } catch {
    // fallback to static registry
  }
  return buildStaticSitemapEntries(base);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await fetchSitemapEntries();
  return entries.map((e) => ({
    url: e.loc,
    lastModified: e.lastmod,
    changeFrequency: (e.changefreq as MetadataRoute.Sitemap[number]["changeFrequency"]) || "weekly",
    priority: e.priority,
  }));
}
