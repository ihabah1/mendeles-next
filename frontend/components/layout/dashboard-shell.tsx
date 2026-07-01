"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", labelKey: "overview", permission: null },
  { href: "/dashboard/users", labelKey: "users", permission: "users.view" },
  { href: "/dashboard/content", labelKey: "content", permission: "content.view" },
  { href: "/dashboard/roles", labelKey: "roles", permission: "roles.view" },
  { href: "/dashboard/settings", labelKey: "settings", permission: "settings.view" },
  { href: "/dashboard/seo", labelKey: "seo", permission: "seo.view" },
  { href: "/dashboard/audit", labelKey: "audit", permission: "audit.view" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ta = useTranslations("a11y");
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const items = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen md:flex">
      <aside className="w-full border-b border-[var(--border)] md:w-64 md:border-b-0 md:border-e">
        <div className="flex items-center justify-between gap-2 p-4 md:block">
          <div>
            <div className="text-lg font-bold">Mendeles</div>
            <div className="text-xs text-[var(--muted-fg)]">{user?.email}</div>
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
                "rounded-md px-3 py-2 text-sm whitespace-nowrap",
                pathname === item.href ? "bg-[var(--muted)] font-semibold" : "hover:bg-[var(--muted)]",
              )}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md px-3 py-2 text-start text-sm hover:bg-[var(--muted)] md:mt-4"
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
