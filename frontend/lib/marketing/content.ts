export const SOLUTION_SLUGS = [
  "generate-leads",
  "seo-landing-pages",
  "marketing-automation",
  "ai-qualification",
  "lead-management",
  "analytics",
] as const;

export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

export const INDUSTRY_SLUGS = [
  "electricians",
  "plumbers",
  "lawyers",
  "insurance",
  "mortgage",
  "solar",
  "medical-clinics",
  "dentists",
  "real-estate",
  "education",
  "agencies",
  "affiliate-marketers",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

export const TRUST_KEYS = ["fast", "secure", "accessible", "seo", "production", "ai"] as const;

export const AI_CAPABILITY_KEYS = [
  "landingPages",
  "seoAssistant",
  "leadQualification",
  "contentOptimization",
] as const;

export const HOW_IT_WORKS_KEYS = [
  "search",
  "landingPage",
  "visitor",
  "qualification",
  "lead",
  "customer",
] as const;

export const MAIN_NAV = [
  { href: "/solutions", labelKey: "navSolutions" },
  { href: "/industries", labelKey: "navIndustries" },
  { href: "/templates", labelKey: "navTemplates" },
  { href: "/resources", labelKey: "navResources" },
  { href: "/blog", labelKey: "navBlog" },
  { href: "/pricing", labelKey: "navPricing" },
  { href: "/company", labelKey: "navCompany" },
] as const;
