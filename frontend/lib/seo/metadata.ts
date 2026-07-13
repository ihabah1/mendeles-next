import type { Metadata } from "next";
import { localizePath } from "./canonical";
import { DEFAULT_SEO_SETTINGS, fetchPublicSEO, mergePageMetadata } from "./settings";
import { absoluteSiteUrl, getSiteUrl } from "./site-url";
import type { PageSEOInput } from "./types";

/** Central metadata engine — every page should call this once on the server. */
export async function buildPageMetadata(page: PageSEOInput): Promise<Metadata> {
  const bundle = await fetchPublicSEO();
  const settings = bundle?.settings ?? DEFAULT_SEO_SETTINGS;
  const locale = page.locale || settings.default_language || "he";
  const localizedPath = localizePath(page.path, locale);
  const base = getSiteUrl();

  const meta = mergePageMetadata(settings, { ...page, path: localizedPath, locale });
  const hePath = localizePath(page.path, "he");
  const enPath = localizePath(page.path, "en");
  const arPath = localizePath(page.path, "ar");

  const result: Metadata = {
    metadataBase: new URL(base),
    title: meta.title,
    description: meta.description,
    authors: meta.author ? [{ name: meta.author }] : undefined,
    alternates: {
      canonical: meta.canonical,
      languages: {
        "he-IL": absoluteSiteUrl(hePath, base),
        en: absoluteSiteUrl(enPath, base),
        ar: absoluteSiteUrl(arPath, base),
        "x-default": absoluteSiteUrl(hePath, base),
      },
    },
    robots: meta.robots,
    openGraph: {
      title: meta.open_graph.title,
      description: meta.open_graph.description,
      url: meta.open_graph.url,
      siteName: meta.open_graph.site_name,
      locale: meta.open_graph.locale,
      type: meta.open_graph.type as "website",
      images: meta.open_graph.image ? [{ url: meta.open_graph.image }] : undefined,
    },
    twitter: {
      card: meta.twitter.card as "summary_large_image",
      title: meta.twitter.title,
      description: meta.twitter.description,
      images: meta.twitter.image ? [meta.twitter.image] : undefined,
    },
  };

  return result;
}
