import type { PageMetadata, SEOIssue, SEOSettings } from "./types";

export function validatePageSEO(meta: PageMetadata, slug?: string, existingSlugs?: string[]): {
  valid: boolean;
  score: number;
  issues: SEOIssue[];
} {
  const issues: SEOIssue[] = [];

  if (!meta.title) issues.push({ code: "missing_title", severity: "error", message: "Missing page title" });
  if (!meta.description) issues.push({ code: "missing_description", severity: "error", message: "Missing meta description" });
  if (!meta.canonical) issues.push({ code: "missing_canonical", severity: "warning", message: "Missing canonical URL" });
  if (!meta.open_graph.image) issues.push({ code: "missing_open_graph", severity: "warning", message: "Missing Open Graph image" });
  if (slug && existingSlugs?.includes(slug)) {
    issues.push({ code: "duplicate_slug", severity: "error", message: `Slug '${slug}' is already in use` });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 10);

  return { valid: errors === 0, score, issues };
}

export function validateGlobalSEO(settings: SEOSettings): { valid: boolean; score: number; issues: SEOIssue[] } {
  const issues: SEOIssue[] = [];

  if (!settings.site_name) issues.push({ code: "missing_site_name", severity: "error", message: "Missing site name" });
  if (!settings.default_title) issues.push({ code: "missing_default_title", severity: "warning", message: "Missing default title" });
  if (!settings.default_description) issues.push({ code: "missing_default_description", severity: "warning", message: "Missing default description" });
  if (!settings.canonical_base_url) issues.push({ code: "missing_canonical_base", severity: "error", message: "Missing canonical base URL" });
  if (!settings.organization_name) issues.push({ code: "missing_organization", severity: "warning", message: "Missing organization name" });

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 25 - warnings * 10);

  return { valid: errors === 0, score, issues };
}
