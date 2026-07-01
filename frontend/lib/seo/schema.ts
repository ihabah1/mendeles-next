import type { BreadcrumbItem, SEOSettings } from "./types";
import { buildCanonicalUrl } from "./canonical";

export function organizationSchema(settings: SEOSettings) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.organization_name || settings.site_name,
    url: settings.organization_url || settings.canonical_base_url,
  };
  if (settings.organization_logo) schema.logo = settings.organization_logo;
  return schema;
}

export function websiteSchema(settings: SEOSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_name || settings.organization_name,
    url: settings.canonical_base_url || settings.organization_url,
    inLanguage: settings.default_language || "he",
  };
}

export function breadcrumbSchema(settings: SEOSettings, items: BreadcrumbItem[]) {
  const base = settings.canonical_base_url.replace(/\/$/, "");
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
