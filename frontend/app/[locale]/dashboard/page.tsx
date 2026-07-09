"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { StatCard } from "@/components/admin/stat-card";
import { ExpandableStatCard } from "@/components/admin/expandable-stat-card";
import { ContactWidgetFeatureFlag } from "@/components/admin/contact-widget-feature-flag";
import { Card } from "@/components/ui/card";
import { adminApi } from "@/lib/api/dashboard";
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      </div>

      {overview.isLoading && <p className="text-sm text-[var(--muted-fg)]">{tc("loading")}</p>}
      {overview.isError && <p className="text-sm text-red-600">{t("loadError")}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("usersTotal")} value={data.system.users_total} hint={t("usersActive", { n: data.system.users_active })} accent />
            <StatCard label={t("usersVerified")} value={data.system.users_verified} hint={t("tenantsTotal")} />
            <StatCard label={t("tenantsTotal")} value={data.system.tenants_total} hint={t("tenantsActive", { n: data.system.tenants_active })} />
            <StatCard label={t("rolesTotal")} value={data.system.roles_total} hint={t("permissionsTotal", { n: data.system.permissions_total })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExpandableStatCard
              label={t("logins7d")}
              value={data.system.logins_last_7d}
              hint={t("audit24h", { n: data.system.audit_last_24h })}
              accent
              daily={data.daily_logins}
              dailyLabel={t("dailyBreakdown")}
            />
            <StatCard
              label={t("landingPagesTotal")}
              value={data.system.landing_pages_total}
              hint={t("landingPagesPublished", { n: data.system.landing_pages_published })}
            />
            <StatCard
              label={t("landingPagesPublishedLabel")}
              value={data.system.landing_pages_published}
              hint={t("landingPagesDraft", { n: data.system.landing_pages_draft })}
            />
            <ExpandableStatCard
              label={t("leadsTotal")}
              value={data.system.leads_total}
              hint={t("audit24hLabel", { n: data.system.audit_last_24h })}
              daily={data.daily_audit}
              dailyLabel={t("dailyBreakdown")}
            />
          </div>

          <ContactWidgetFeatureFlag />

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">{t("automationTitle")}</h3>
                <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("automationSubtitle")}</p>
              </div>
              <Link href="/dashboard/automation" className="text-xs text-[var(--accent)] hover:underline">
                {t("viewAll")}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label={t("automationRunning")} value={data.automation.running_jobs} />
              <StatCard label={t("automationQueue")} value={data.automation.queue_size} />
              <StatCard label={t("automationScheduled")} value={data.automation.scheduled_jobs} />
              <StatCard label={t("automationCompleted")} value={data.automation.completed_jobs} />
              <StatCard label={t("automationFailed")} value={data.automation.failed_jobs} />
              <StatCard label={t("automationPaused")} value={data.automation.paused_jobs} />
              <StatCard label={t("automationWaitingApproval")} value={data.automation.waiting_approval} />
              <StatCard label={t("automationWorkers")} value={data.automation.workers_total} />
              <StatCard
                label={t("automationEta")}
                value={
                  data.automation.estimated_completion_minutes != null
                    ? t("automationEtaMinutes", { n: data.automation.estimated_completion_minutes })
                    : "—"
                }
              />
            </div>
            {data.recent_jobs.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted-fg)]">{t("automationNoJobs")}</p>
            ) : (
              <ul className="mt-4 divide-y text-sm">
                {data.recent_jobs.map((job) => (
                  <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/dashboard/automation/${job.id}`} className="font-medium hover:underline">
                      {job.name}
                    </Link>
                    <span className="text-xs text-[var(--muted-fg)]">{job.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
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

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{t("quickLinks")}</h3>
                <Link href="/dashboard/links" className="text-xs text-[var(--accent)] hover:underline">
                  {t("viewAllInterfaces")}
                </Link>
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard/users" className="text-[var(--accent)] hover:underline">
                    {t("manageUsers")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/settings" className="text-[var(--accent)] hover:underline">
                    {t("manageSettings")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/content" className="text-[var(--accent)] hover:underline">
                    {t("manageContent")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/leads" className="text-[var(--accent)] hover:underline">
                    {t("viewLeads")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/audit" className="text-[var(--accent)] hover:underline">
                    {t("viewAudit")}
                  </Link>
                </li>
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{t("recentLogins")}</h3>
                <Link href="/dashboard/audit" className="text-xs text-[var(--accent)] hover:underline">
                  {t("viewAll")}
                </Link>
              </div>
              <ul className="divide-y text-sm">
                {data.recent_logins.length === 0 ? (
                  <li className="py-3 text-[var(--muted-fg)]">{t("noLogins")}</li>
                ) : (
                  data.recent_logins.map((row) => (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="font-medium">{row.user_email || "—"}</p>
                        <p className="text-xs text-[var(--muted-fg)]">{row.ip_address || "—"}</p>
                      </div>
                      <time className="text-xs text-[var(--muted-fg)]">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </time>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{t("recentLandingPages")}</h3>
                <Link href="/dashboard/content" className="text-xs text-[var(--accent)] hover:underline">
                  {t("viewAll")}
                </Link>
              </div>
              <ul className="divide-y text-sm">
                {data.recent_landing_pages.length === 0 ? (
                  <li className="py-3 text-[var(--muted-fg)]">{t("noLandingPages")}</li>
                ) : (
                  data.recent_landing_pages.map((page) => (
                    <li key={page.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{page.title}</p>
                        <p className="truncate text-xs text-[var(--muted-fg)]">
                          {page.tenant_name} · {page.full_path || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-[var(--muted)] px-2 py-0.5 text-xs">
                        {t(`pageStatus.${page.status}` as "pageStatus.published")}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t("recentActivity")}</h3>
              <Link href="/dashboard/audit" className="text-xs text-[var(--accent)] hover:underline">
                {t("viewAll")}
              </Link>
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
