import { INDUSTRY_SLUGS, SOLUTION_SLUGS } from "@/lib/marketing/content";

export type InterfaceCategory = "admin" | "auth" | "public" | "api";

export type SiteInterfaceDef = {
  id: string;
  href: string;
  /** RBAC permission required to see this link (admin section). */
  permission?: string;
  /** Platform admin control center only. */
  adminOnly?: boolean;
  openInNewTab?: boolean;
};

export const ADMIN_INTERFACE_DEFS: SiteInterfaceDef[] = [
  { id: "dashboard", href: "/dashboard", adminOnly: true },
  { id: "links", href: "/dashboard/links", adminOnly: true },
  { id: "users", href: "/dashboard/users", permission: "users.view" },
  { id: "content", href: "/dashboard/content", permission: "content.view" },
  { id: "leads", href: "/dashboard/leads", permission: "leads.view" },
  { id: "workspace", href: "/dashboard/workspace", permission: "ai_seo.view" },
  { id: "aiSeo", href: "/dashboard/ai-seo", permission: "ai_seo.view" },
  { id: "automation", href: "/dashboard/automation", permission: "automation.view" },
  { id: "seo", href: "/dashboard/seo", permission: "seo.view" },
  { id: "roles", href: "/dashboard/roles", permission: "roles.view" },
  { id: "settings", href: "/dashboard/settings", permission: "settings.view" },
  { id: "integrations", href: "/dashboard/settings/integrations/google", permission: "integrations.view" },
  { id: "audit", href: "/dashboard/audit", permission: "audit.view" },
];

export const AUTH_INTERFACE_DEFS: SiteInterfaceDef[] = [
  { id: "login", href: "/login" },
  { id: "register", href: "/register" },
  { id: "forgotPassword", href: "/forgot-password" },
  { id: "resetPassword", href: "/reset-password" },
  { id: "verifyEmail", href: "/verify-email" },
];

export const PUBLIC_INTERFACE_DEFS: SiteInterfaceDef[] = [
  { id: "home", href: "/" },
  { id: "company", href: "/company" },
  { id: "accessibility", href: "/accessibility" },
  { id: "solutionsHub", href: "/solutions" },
  { id: "industriesHub", href: "/industries" },
  ...SOLUTION_SLUGS.map((slug) => ({
    id: `solution-${slug}`,
    href: `/solutions/${slug}`,
  })),
  ...INDUSTRY_SLUGS.map((slug) => ({
    id: `industry-${slug}`,
    href: `/industries/${slug}`,
  })),
];

export const API_INTERFACE_DEFS: SiteInterfaceDef[] = [
  { id: "apiDocs", href: "/api/v1/docs/", openInNewTab: true },
  { id: "apiHealth", href: "/api/v1/health/", openInNewTab: true },
  { id: "apiSeoSitemap", href: "/api/v1/seo/sitemap/", openInNewTab: true },
  { id: "apiSeoRobots", href: "/api/v1/seo/robots/", openInNewTab: true },
  { id: "apiSeoPublic", href: "/api/v1/seo/public/", openInNewTab: true },
];

export function filterAdminInterfaces(
  defs: SiteInterfaceDef[],
  hasPermission: (p: string) => boolean,
  isAdmin: boolean,
): SiteInterfaceDef[] {
  return defs.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });
}
