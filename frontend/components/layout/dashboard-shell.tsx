"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { isClientPortalUser } from "@/lib/auth/portal-mode";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: string;
  permission: string | null;
};

type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "control",
    labelKey: "groupControl",
    items: [
      { href: "/dashboard", labelKey: "overview", permission: null },
      { href: "/dashboard?tab=flags", labelKey: "featureFlags", permission: "settings.view" },
    ],
  },
  {
    id: "people",
    labelKey: "groupPeople",
    items: [
      { href: "/dashboard/users", labelKey: "users", permission: "users.view" },
      { href: "/dashboard/users?tab=inbox", labelKey: "messages", permission: "users.view" },
      { href: "/dashboard/leads", labelKey: "leads", permission: "leads.view" },
      { href: "/dashboard/requests", labelKey: "creationRequests", permission: "tenants.view" },
      { href: "/dashboard/whatsapp", labelKey: "whatsapp", permission: "integrations.view" },
    ],
  },
  {
    id: "content",
    labelKey: "groupContent",
    items: [
      { href: "/dashboard/content", labelKey: "content", permission: "content.view" },
      { href: "/dashboard/studio/articles", labelKey: "articleStudio", permission: "content.edit" },
      { href: "/dashboard/studio/landing-pages", labelKey: "landingStudio", permission: "content.edit" },
      { href: "/dashboard/workspace", labelKey: "workspace", permission: "ai_seo.view" },
      { href: "/dashboard/ai-seo", labelKey: "aiSeo", permission: "ai_seo.view" },
      { href: "/dashboard/traffic", labelKey: "traffic", permission: "ai_seo.view" },
      { href: "/dashboard/seo", labelKey: "seo", permission: "seo.view" },
      { href: "/dashboard/links", labelKey: "siteLinks", permission: "tenants.view" },
    ],
  },
  {
    id: "automation",
    labelKey: "groupAutomation",
    items: [
      { href: "/dashboard/automation", labelKey: "agents", permission: "automation.view" },
      { href: "/dashboard/ai-automation", labelKey: "aiAutomation", permission: "automation.view" },
    ],
  },
  {
    id: "system",
    labelKey: "groupSystem",
    items: [
      { href: "/dashboard/settings", labelKey: "settings", permission: "settings.view" },
      { href: "/dashboard/roles", labelKey: "roles", permission: "roles.view" },
      { href: "/dashboard/audit", labelKey: "reports", permission: "audit.view" },
    ],
  },
];

const CLIENT_NAV = [
  { href: "/dashboard", labelKey: "overview" },
  { href: "/dashboard/requests", labelKey: "creationRequests" },
  { href: "/dashboard/leads", labelKey: "leads" },
  { href: "/dashboard/inbox", labelKey: "mailbox" },
  { href: "/dashboard/profile", labelKey: "changeDetails" },
  { href: "/forgot-password", labelKey: "resetPassword" },
] as const;

const OPEN_GROUPS_KEY = "mendeles-admin-nav-open";

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

function groupContainsActive(group: NavGroup, pathname: string, tab: string | null) {
  return group.items.some((item) => navIsActive(pathname, tab, item.href));
}

function isClientPortal(user: ReturnType<typeof useAuth>["user"], hasPermission: (p: string) => boolean) {
  return isClientPortalUser(user, hasPermission);
}

function readOpenGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ta = useTranslations("a11y");
  const tClient = useTranslations("clientPortal");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user, logout, hasPermission } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const clientMode = isClientPortal(user, hasPermission);
  const isControlCenter = pathname === "/dashboard";

  const adminGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    const stored = readOpenGroups();
    const next: Record<string, boolean> = {};
    for (const group of ADMIN_NAV_GROUPS) {
      const active = groupContainsActive(group, pathname, tab);
      if (active) {
        next[group.id] = true;
      } else if (typeof stored[group.id] === "boolean") {
        next[group.id] = stored[group.id];
      } else {
        next[group.id] = group.id === "control" || group.id === "people";
      }
    }
    setOpenGroups(next);
  }, [pathname, tab]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className={cn("min-h-screen md:flex", isControlCenter && !clientMode && "dashboard-cc")}>
      <aside className="flex w-full flex-col border-b border-[var(--border)] md:w-72 md:border-b-0 md:border-e">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] p-4 md:block">
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

        <nav
          className="flex flex-1 gap-1 overflow-x-auto p-2 md:flex-col md:overflow-y-auto md:overflow-x-hidden"
          aria-label={ta("mainNav")}
        >
          {clientMode ? (
            <>
              {CLIENT_NAV.map((item) => (
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
            </>
          ) : (
            adminGroups.map((group) => {
              const isOpen = openGroups[group.id] !== false;
              return (
                <div key={group.id} className="min-w-[11rem] shrink-0 md:min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    aria-expanded={isOpen}
                  >
                    <span>{t(group.labelKey as "groupControl")}</span>
                    <span className="text-[10px] opacity-70" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="ms-1 flex flex-col gap-0.5 border-s border-[var(--border)] ps-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "rounded-md px-3 py-2 text-sm whitespace-nowrap",
                            navIsActive(pathname, tab, item.href)
                              ? "bg-[var(--muted)] font-semibold text-[var(--foreground)]"
                              : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                          )}
                        >
                          {t(item.labelKey as "overview")}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => logout()}
            className="mt-auto rounded-md px-3 py-2 text-start text-sm text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] md:mt-4"
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
