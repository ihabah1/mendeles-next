import { JsonLd } from "@/components/seo/json-ld";
import { pageSchemas } from "@/lib/seo/schema";
import { DEFAULT_SEO_SETTINGS, fetchPublicSEO } from "@/lib/seo/settings";
import type { BreadcrumbItem } from "@/lib/seo/types";

export async function PageSchemas({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const bundle = await fetchPublicSEO();
  const settings = bundle?.settings ?? DEFAULT_SEO_SETTINGS;
  return <JsonLd data={pageSchemas(settings, breadcrumbs)} />;
}
