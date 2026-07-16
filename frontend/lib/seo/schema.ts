import type { BreadcrumbItem, SEOSettings } from "./types";
import { buildCanonicalUrl } from "./canonical";
import { resolveSiteUrl, sanitizeSeoUrl } from "./site-url";

export function organizationSchema(settings: SEOSettings) {
  const base = resolveSiteUrl(settings.canonical_base_url);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.organization_name || settings.site_name,
    url: resolveSiteUrl(settings.organization_url || base),
  };
  if (settings.organization_logo) schema.logo = settings.organization_logo;
  return schema;
}

export function websiteSchema(settings: SEOSettings) {
  const base = resolveSiteUrl(settings.canonical_base_url);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name || settings.organization_name,
    url: base,
    inLanguage: settings.default_language || "he",
  };
}

export function breadcrumbSchema(settings: SEOSettings, items: BreadcrumbItem[]) {
  const base = resolveSiteUrl(settings.canonical_base_url).replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => {
      const url = item.url || item.path;
      const full = url.startsWith("http") ? url : buildCanonicalUrl(base, url);
      return {
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
        item: full,
      };
    }),
  };
}

export function articleSchema(settings: SEOSettings, article: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}) {
  const base = resolveSiteUrl(settings.canonical_base_url);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    image: article.image ? [sanitizeSeoUrl(article.image, base)] : undefined,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      "@type": "Organization",
      name: article.authorName || settings.organization_name || settings.site_name,
    },
    publisher: {
      "@type": "Organization",
      name: settings.organization_name || settings.site_name,
      logo: settings.organization_logo
        ? { "@type": "ImageObject", url: sanitizeSeoUrl(settings.organization_logo, base) }
        : undefined,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": article.url },
    url: article.url,
    inLanguage: settings.default_language || "he",
  };
}

export function pageSchemas(settings: SEOSettings, breadcrumbs?: BreadcrumbItem[]) {
  const schemas = [organizationSchema(settings), websiteSchema(settings)];
  if (breadcrumbs?.length) schemas.push(breadcrumbSchema(settings, breadcrumbs));
  return schemas;
}

// Architecture-ready stubs
export const schemaStubs = {
  webpage: "WebPage",
  faq: "FAQPage",
  article: "Article",
  localBusiness: "LocalBusiness",
} as const;
