"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { isClientPortalUser } from "@/lib/auth/portal-mode";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/dashboard", labelKey: "overview", permission: null },
  { href: "/dashboard?tab=flags", labelKey: "featureFlags", permission: "settings.view" },
  { href: "/dashboard/users", labelKey: "users", permission: "users.view" },
  { href: "/dashboard/requests", labelKey: "creationRequests", permission: "tenants.view" },
  { href: "/dashboard/traffic", labelKey: "traffic", permission: "ai_seo.view" },
  { href: "/dashboard/content", labelKey: "content", permission: "content.view" },
  { href: "/dashboard/automation", labelKey: "agents", permission: "automation.view" },
  { href: "/dashboard/leads", labelKey: "leads", permission: "leads.view" },
  { href: "/dashboard/users?tab=inbox", labelKey: "messages", permission: "users.view" },
  { href: "/dashboard/audit", labelKey: "reports", permission: "audit.view" },
  { href: "/dashboard/settings", labelKey: "settings", permission: "settings.view" },
  { href: "/dashboard/whatsapp", labelKey: "whatsapp", permission: "integrations.view" },
  { href: "/dashboard/links", labelKey: "siteLinks", permission: "tenants.view" },
  { href: "/dashboard/studio/articles", labelKey: "articleStudio", permission: "content.edit" },
  { href: "/dashboard/studio/landing-pages", labelKey: "landingStudio", permission: "content.edit" },
  { href: "/dashboard/workspace", labelKey: "workspace", permission: "ai_seo.view" },
  { href: "/dashboard/ai-seo", labelKey: "aiSeo", permission: "ai_seo.view" },
  { href: "/dashboard/roles", labelKey: "roles", permission: "roles.view" },
  { href: "/dashboard/seo", labelKey: "seo", permission: "seo.view" },
] as const;

const CLIENT_NAV = [
  { href: "/dashboard", labelKey: "overview" },
  { href: "/dashboard/requests", labelKey: "creationRequests" },
  { href: "/dashboard/leads", labelKey: "leads" },
  { href: "/dashboard/inbox", labelKey: "mailbox" },
  { href: "/dashboard/profile", labelKey: "changeDetails" },
  { href: "/forgot-password", labelKey: "resetPassword" },
] as const;

function navIsActive(pathname: string, tab: string | null, href: string) {
  const [path, query] = href.split("?");
  if (pathname !== path && !(path === "/dashboard/users" && pathname.startsWith("/dashboard/users"))) {
    return false;
  }
  if (path === "/forgot-password") return pathname === "/forgot-password";
  if (!query) {
    if (path === "/dashboard") return !tab || tab === "overview";
    if (path === "/dashboard/users") return !tab || tab === "users";
    return pathname === path;
  }
  const params = new URLSearchParams(query);
  const expectedTab = params.get("tab");
  return tab === expectedTab;
}

function isClientPortal(user: ReturnType<typeof useAuth>["user"], hasPermission: (p: string) => boolean) {
  return isClientPortalUser(user, hasPermission);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ta = useTranslations("a11y");
  const tClient = useTranslations("clientPortal");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user, logout, hasPermission } = useAuth();

  const clientMode = isClientPortal(user, hasPermission);
  const items = clientMode
    ? CLIENT_NAV
    : ADMIN_NAV.filter((item) => !item.permission || hasPermission(item.permission));
  const isControlCenter = pathname === "/dashboard";

  return (
    <div className={cn("min-h-screen md:flex", isControlCenter && !clientMode && "dashboard-cc")}>
      <aside className="w-full border-b border-[var(--border)] md:w-64 md:border-b-0 md:border-e">
        <div className="flex items-center justify-between gap-2 p-4 md:block">
          <div>
            <div className="text-lg font-bold">Mendeles</div>
            <div className="text-xs text-[var(--muted-fg)]">{user?.email}</div>
            {clientMode && (
              <div className="mt-1 text-xs font-medium text-[var(--accent)]">
                {tClient("creditsBalance")}: {user?.credits_balance ?? 0}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 md:mt-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col" aria-label={ta("mainNav")}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm whitespace-nowrap text-[var(--foreground)]",
                navIsActive(pathname, tab, item.href)
                  ? "bg-[var(--muted)] font-semibold"
                  : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {t(item.labelKey as "overview")}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md px-3 py-2 text-start text-sm text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] md:mt-4"
          >
            {t("logout")}
          </button>
        </nav>
      </aside>
      <main id="main-content" tabIndex={-1} className="flex-1 p-6 outline-none">
        {children}
      </main>
    </div>
  );
}
