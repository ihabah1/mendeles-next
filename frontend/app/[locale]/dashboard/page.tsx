"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { StatCard } from "@/components/admin/stat-card";
import { ViewsChart } from "@/components/admin/views-chart";
import { Card } from "@/components/ui/card";
import { adminApi } from "@/lib/api/dashboard";
import { landingPagePath } from "@/lib/landing/demo-pages";
import { healthApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardPage() {
  const t = useTranslations("admin");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission("tenants.view") || user?.roles.includes("super_admin");

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: adminApi.overview,
    enabled: isAdmin,
  });
  const health = useQuery({ queryKey: ["health"], queryFn: healthApi.check });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {td("welcome")}, {user?.first_name || user?.email}
        </h1>
        <Card>
          <h2 className="mb-2 font-semibold">{td("health")}</h2>
          {health.isLoading && <p>{tc("loading")}</p>}
          {health.data && (
            <p className="text-sm text-[var(--muted-fg)]">
              {health.data.status} · DB {health.data.database}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const data = overview.data;
  const lp = data?.landing_preview;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        </div>
        {lp?.demo && (
          <span className="rounded-full border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-1 text-xs text-[var(--warning)]">
            {t("demoData")}
          </span>
        )}
      </div>

      {overview.isLoading && <p className="text-sm text-[var(--muted-fg)]">{tc("loading")}</p>}
      {overview.isError && <p className="text-sm text-red-600">{t("loadError")}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("usersTotal")} value={data.system.users_total} hint={t("usersActive", { n: data.system.users_active })} accent />
            <StatCard label={t("tenantsTotal")} value={data.system.tenants_total} hint={t("tenantsActive", { n: data.system.tenants_active })} />
            <Link href="/dashboard/pages" className="block transition hover:opacity-90">
              <StatCard label={t("pagesTotal")} value={lp?.pages_total ?? 0} hint={t("pagesPublished", { n: lp?.pages_published ?? 0 })} accent />
            </Link>
            <StatCard label={t("totalViews")} value={lp?.total_views?.toLocaleString() ?? 0} trend={`+${lp?.views_today ?? 0}`} hint={t("viewsToday")} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {lp?.views_by_day && <ViewsChart data={lp.views_by_day} label={t("viewsChart")} />}
            </div>
            <Card>
              <h3 className="font-semibold">{t("leadsSummary")}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-fg)]">{t("leadsTotal")}</dt>
                  <dd className="font-semibold">{lp?.leads_total}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-fg)]">{t("conversionRate")}</dt>
                  <dd className="font-semibold">{lp?.conversion_rate}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-fg)]">{t("permissionsTotal")}</dt>
                  <dd className="font-semibold">{data.system.permissions_total}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-fg)]">{t("logins7d")}</dt>
                  <dd className="font-semibold">{data.system.logins_last_7d}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{t("topPages")}</h3>
                <Link href="/dashboard/pages" className="text-xs text-[var(--accent)] hover:underline">
                  {t("managePages")}
                </Link>
              </div>
              <ul className="space-y-3">
                {lp?.top_pages.map((page) => (
                  <li key={page.slug} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={landingPagePath(page.slug)} className="min-w-0 flex-1 hover:opacity-80" target="_blank">
                      <p className="truncate font-medium text-[var(--accent)]">{page.name}</p>
                      <p className="text-xs text-[var(--muted-fg)]">{landingPagePath(page.slug)}</p>
                    </Link>
                    <span className="shrink-0 rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-medium">
                      {page.views.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{t("usersByRole")}</h3>
                <Link href="/dashboard/roles" className="text-xs text-[var(--accent)] hover:underline">
                  {t("manageRoles")}
                </Link>
              </div>
              <ul className="space-y-2">
                {data.users_by_role.length === 0 ? (
                  <li className="text-sm text-[var(--muted-fg)]">{t("noRoles")}</li>
                ) : (
                  data.users_by_role.map((row) => (
                    <li key={row.role} className="flex items-center justify-between rounded-lg bg-[var(--muted)]/50 px-3 py-2 text-sm">
                      <span>{row.name || row.role}</span>
                      <span className="font-semibold">{row.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t("recentActivity")}</h3>
              <span className="text-xs text-[var(--muted-fg)]">
                {t("audit24h", { n: data.system.audit_last_24h })}
              </span>
            </div>
            <ul className="divide-y text-sm">
              {data.recent_audit.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{row.action}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{row.user_email || "—"}</p>
                  </div>
                  <time className="text-xs text-[var(--muted-fg)]">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </time>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
