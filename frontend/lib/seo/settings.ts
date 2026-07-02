import { backendBase } from "@/lib/api/backend-url";
import type { PageMetadata, SEOSettings, SEOPublicBundle } from "./types";

export const DEFAULT_SEO_SETTINGS: SEOSettings = {
  site_name: "Mendeles",
  default_title: "Mendeles",
  default_description: "",
  default_keywords: "",
  default_author: "",
  default_language: "he",
  robots_policy: "index,follow",
  canonical_base_url: process.env.NEXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3000",
  default_og_image: "",
  default_twitter_image: "",
  organization_name: "Mendeles",
  organization_logo: "",
  organization_url: "",
};

let cachedBundle: SEOPublicBundle | null = null;
let cacheTs = 0;
const CACHE_MS = 60_000;

export async function fetchPublicSEO(): Promise<SEOPublicBundle | null> {
  const now = Date.now();
  if (cachedBundle && now - cacheTs < CACHE_MS) return cachedBundle;

  try {
    const res = await fetch(`${backendBase()}/api/v1/seo/public/`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    cachedBundle = (await res.json()) as SEOPublicBundle;
    cacheTs = now;
    return cachedBundle;
  } catch {
    return null;
  }
}

export function mergePageMetadata(settings: SEOSettings, page: {
  title?: string;
  description?: string;
  keywords?: string;
  path: string;
  locale?: string;
  author?: string;
  og_image?: string;
  og_type?: string;
  canonical?: string;
}): PageMetadata {
  const locale = page.locale || settings.default_language || "he";
  const title = page.title || settings.default_title || settings.site_name;
  const description = page.description || settings.default_description;
  const keywords = page.keywords || settings.default_keywords;
  const base = settings.canonical_base_url.replace(/\/$/, "");
  const canonical = page.canonical || (base ? `${base}${page.path.startsWith("/") ? page.path : `/${page.path}`}` : page.path);
  const ogImage = page.og_image || settings.default_og_image;
  const twitterImage = settings.default_twitter_image || ogImage;

  return {
    title,
    description,
    keywords,
    author: page.author || settings.default_author,
    language: locale,
    canonical,
    robots: settings.robots_policy,
    open_graph: {
      title,
      description,
      image: ogImage,
      url: canonical,
      type: page.og_type || "website",
      site_name: settings.site_name || settings.organization_name,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: twitterImage,
    },
  };
}
