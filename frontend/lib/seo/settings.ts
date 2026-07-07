import { backendBase } from "@/lib/api/backend-url";
import { absoluteSiteUrl, getSiteUrl, resolveSiteUrl, sanitizeSeoUrl } from "./site-url";
import type { PageMetadata, SEOSettings, SEOPublicBundle } from "./types";

export const DEFAULT_SEO_SETTINGS: SEOSettings = {
  site_name: "Mendeles",
  default_title: "Mendeles",
  default_description: "",
  default_keywords: "",
  default_author: "",
  default_language: "he",
  robots_policy: "index,follow",
  canonical_base_url: getSiteUrl(),
  default_og_image: "",
  default_twitter_image: "",
  organization_name: "Mendeles",
  organization_logo: "",
  organization_url: getSiteUrl(),
};

let cachedBundle: SEOPublicBundle | null = null;
let cacheTs = 0;
const CACHE_MS = 60_000;

function normalizeSettings(settings: SEOSettings): SEOSettings {
  const base = resolveSiteUrl(settings.canonical_base_url);
  return {
    ...settings,
    canonical_base_url: base,
    organization_url: sanitizeSeoUrl(settings.organization_url || base, base) || base,
    default_og_image: settings.default_og_image ? sanitizeSeoUrl(settings.default_og_image, base) : "",
    default_twitter_image: settings.default_twitter_image ? sanitizeSeoUrl(settings.default_twitter_image, base) : "",
  };
}

export async function fetchPublicSEO(): Promise<SEOPublicBundle | null> {
  const now = Date.now();
  if (cachedBundle && now - cacheTs < CACHE_MS) return cachedBundle;

  try {
    const res = await fetch(`${backendBase()}/api/v1/seo/public/`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const bundle = (await res.json()) as SEOPublicBundle;
    cachedBundle = {
      ...bundle,
      settings: normalizeSettings(bundle.settings),
    };
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
  const normalizedSettings = normalizeSettings(settings);
  const locale = page.locale || normalizedSettings.default_language || "he";
  const title = page.title || normalizedSettings.default_title || normalizedSettings.site_name;
  const description = page.description || normalizedSettings.default_description;
  const base = normalizedSettings.canonical_base_url;
  const canonical = sanitizeSeoUrl(
    page.canonical || absoluteSiteUrl(page.path.startsWith("/") ? page.path : `/${page.path}`, base),
    base,
  );
  const ogImage = page.og_image
    ? sanitizeSeoUrl(page.og_image, base)
    : normalizedSettings.default_og_image
      ? sanitizeSeoUrl(normalizedSettings.default_og_image, base)
      : "";
  const twitterImage = normalizedSettings.default_twitter_image
    ? sanitizeSeoUrl(normalizedSettings.default_twitter_image, base)
    : ogImage;

  return {
    title,
    description,
    keywords: "",
    author: page.author || normalizedSettings.default_author,
    language: locale,
    canonical,
    robots: normalizedSettings.robots_policy,
    open_graph: {
      title,
      description,
      image: ogImage,
      url: canonical,
      type: page.og_type || "website",
      site_name: normalizedSettings.site_name || normalizedSettings.organization_name,
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
