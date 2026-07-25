export const MAIN_NAV = [
  { href: "/solutions", labelKey: "navSolutions" },
  { href: "/industries", labelKey: "navIndustries" },
  { href: "/blog", labelKey: "navBlog", featured: true },
  { href: "/company", labelKey: "navCompany" },
] as const;

export const FEATURED_NAV_CLASS =
  "relative inline-flex animate-pulse items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-[#6F42F5] to-amber-300 px-5 py-2 text-sm font-black tracking-wide text-white shadow-[0_0_28px_rgba(34,211,238,0.45)] ring-2 ring-white/30 transition hover:scale-[1.05] hover:animate-none hover:shadow-[0_0_36px_rgba(251,191,36,0.5)]";

export const FEATURED_NAV_MOBILE_CLASS =
  "relative block rounded-xl bg-gradient-to-r from-cyan-400 via-[#6F42F5] to-amber-300 px-4 py-3.5 text-center text-sm font-black tracking-wide text-white shadow-[0_10px_28px_rgba(34,211,238,0.35)] ring-2 ring-white/25";

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
