"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { healthApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, hasPermission } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: healthApi.check });

  const links = [
    { href: "/dashboard/users", label: "משתמשים", permission: "users.view" },
    { href: "/dashboard/settings", label: "הגדרות", permission: "settings.view" },
    { href: "/dashboard/audit", label: "יומן פעולות", permission: "audit.view" },
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
        {health.isLoading && <p>טוען…</p>}
        {health.data && (
          <p className="text-sm text-[var(--muted-fg)]">
            {health.data.status} · DB {health.data.database} · v{health.data.version}
          </p>
        )}
        {health.isError && <p className="text-sm text-red-600">לא ניתן להתחבר לשרת</p>}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">{t("quickLinks")}</h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md border px-3 py-2 text-sm hover:bg-[var(--muted)]">
              {link.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
