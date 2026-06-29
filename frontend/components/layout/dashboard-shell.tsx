"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", labelKey: "dashboard", permission: null },
  { href: "/dashboard/users", labelKey: "users", permission: "users.view" },
  { href: "/dashboard/settings", labelKey: "settings", permission: "settings.view" },
  { href: "/dashboard/audit", labelKey: "audit", permission: "audit.view" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const items = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="min-h-screen md:flex">
      <aside className="w-full border-b border-[var(--border)] md:w-64 md:border-b-0 md:border-l">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <div className="text-lg font-bold">Mendeles</div>
            <div className="text-xs text-[var(--muted-fg)]">{user?.email}</div>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col" aria-label="ניווט ראשי">
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
