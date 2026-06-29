"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { healthApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tc = useTranslations("common");
  const { user, hasPermission } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: healthApi.check });

  const links = [
    { href: "/dashboard/users" as const, labelKey: "users", permission: "users.view" },
    { href: "/dashboard/settings" as const, labelKey: "settings", permission: "settings.view" },
    { href: "/dashboard/audit" as const, labelKey: "audit", permission: "audit.view" },
  ].filter((l) => hasPermission(l.permission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("welcome")}, {user?.first_name || user?.email}
        </h1>
      </div>
      <Card>
        <h2 className="mb-2 font-semibold">{t("health")}</h2>
        {health.isLoading && <p>{tc("loading")}</p>}
        {health.data && (
          <p className="text-sm text-[var(--muted-fg)]">
            {health.data.status} · DB {health.data.database} · v{health.data.version}
          </p>
        )}
        {health.isError && <p className="text-sm text-red-600">{t("serverUnreachable")}</p>}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">{t("quickLinks")}</h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--muted)]"
            >
              {tNav(link.labelKey)}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
