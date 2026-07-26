export const MAIN_NAV = [
  { href: "/solutions", labelKey: "navSolutions" },
  { href: "/industries", labelKey: "navIndustries" },
  { href: "/blog", labelKey: "navBlog", featured: true },
  { href: "/company", labelKey: "navCompany" },
] as const;

export const FEATURED_NAV_CLASS =
  "relative inline-flex items-center gap-1 rounded-full border border-violet-400/60 bg-violet-500/15 px-4 py-1.5 text-sm font-bold tracking-wide text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.35)] transition hover:bg-violet-500/25 hover:shadow-[0_0_32px_rgba(139,92,246,0.5)]";

export const FEATURED_NAV_MOBILE_CLASS =
  "relative block rounded-xl border border-violet-400/50 bg-violet-500/20 px-4 py-3.5 text-center text-sm font-bold tracking-wide text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.3)]";

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

export const HOW_IT_WORKS_KEYS = [
  "search",
  "landingPage",
  "visitor",
  "qualification",
  "lead",
  "customer",
] as const;
