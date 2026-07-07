export const MAIN_NAV = [
  { href: "/solutions", labelKey: "navSolutions" },
  { href: "/industries", labelKey: "navIndustries" },
  { href: "/blog", labelKey: "navBlog", featured: true },
  { href: "/company", labelKey: "navCompany" },
] as const;

export const FEATURED_NAV_CLASS =
  "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6F42F5] to-indigo-500 px-4 py-1.5 text-sm font-extrabold tracking-wide text-white shadow-[0_0_22px_rgba(111,66,245,0.45)] ring-1 ring-white/20 transition hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(111,66,245,0.55)]";

export const FEATURED_NAV_MOBILE_CLASS =
  "block rounded-xl bg-gradient-to-r from-[#6F42F5] to-indigo-500 px-4 py-3 text-sm font-extrabold tracking-wide text-white shadow-[0_8px_24px_rgba(111,66,245,0.35)]";

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
