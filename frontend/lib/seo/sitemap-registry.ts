import { SYSTEM_LOCALE_CODES } from "@/lib/i18n/system-locales";
import { TOOL_SLUGS } from "@/lib/tools/catalog";
import type { SitemapEntry } from "./types";

/** Static page registry — mirrors backend SitemapService static pages. */
export const STATIC_SITEMAP_PAGES: Array<{ path: string; changefreq: string; priority: number }> = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/solutions", changefreq: "weekly", priority: 0.9 },
  { path: "/industries", changefreq: "weekly", priority: 0.9 },
  { path: "/company", changefreq: "monthly", priority: 0.7 },
  { path: "/blog/tools", changefreq: "monthly", priority: 0.7 },
  ...TOOL_SLUGS.map((slug) => ({
    path: `/blog/tools/${slug}`,
    changefreq: "monthly",
    priority: 0.7,
  })),
];

export const LOCALES = SYSTEM_LOCALE_CODES;

export function localizeSitemapPath(path: string, locale: string): string {
  if (locale === "en") return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

export function buildStaticSitemapEntries(baseUrl: string): SitemapEntry[] {
  const base = baseUrl.replace(/\/$/, "");
  const today = new Date().toISOString().split("T")[0];
  const entries: SitemapEntry[] = [];

  for (const page of STATIC_SITEMAP_PAGES) {
    for (const locale of LOCALES) {
      const path = localizeSitemapPath(page.path, locale);
      entries.push({
        loc: `${base}${path}`,
        lastmod: today,
        changefreq: page.changefreq,
        priority: page.priority,
        locale,
      });
    }
  }
  return entries;
}
