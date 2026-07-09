"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { ControlCenterData } from "@/lib/api/dashboard";
import { ActivityChart, MiniSparkline } from "@/components/control-center/charts";

function KpiCard({
  label,
  value,
  trend,
  spark,
  accent,
}: {
  label: string;
  value: string | number;
  trend?: string;
  spark?: number[];
  accent?: string;
}) {
  return (
    <div className="cc-kpi">
      <p className="cc-kpi__label">{label}</p>
      <p className="cc-kpi__value">{value}</p>
      {trend && <p className="cc-kpi__trend">{trend}</p>}
      {spark && <MiniSparkline data={spark.map((value) => ({ value }))} color={accent} />}
    </div>
  );
}

export function OverviewPanel({ data }: { data: ControlCenterData }) {
  const t = useTranslations("controlCenter");

  const loginSpark = data.daily_activity.map((d) => d.logins);
  const eventSpark = data.daily_activity.map((d) => d.events);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label={t("kpiActiveFlags")} value={data.stats.feature_flags_active} trend={`/${data.feature_flags.length}`} accent="#7c4dff" />
        <KpiCard label={t("kpiUsers")} value={data.stats.users_total.toLocaleString()} trend={t("kpiUsersActive", { n: data.stats.users_active })} spark={loginSpark} accent="#7c4dff" />
        <KpiCard label={t("kpiActiveUsers")} value={data.stats.users_active.toLocaleString()} spark={loginSpark} accent="#00e676" />
        <KpiCard label={t("kpiLogins7d")} value={data.stats.logins_7d.toLocaleString()} spark={loginSpark} accent="#2979ff" />
        <KpiCard label={t("kpiChanges24h")} value={data.stats.changes_24h.toLocaleString()} spark={eventSpark} accent="#7c4dff" />
        <KpiCard label={t("kpiErrors24h")} value={data.stats.errors_24h.toLocaleString()} spark={eventSpark} accent="#ff5252" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cc-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t("activityChartTitle")}</h3>
              <p className="text-xs text-[var(--cc-muted)]">{t("activityChartHint")}</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#7c4dff]" /> {t("legendLogins")}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#2979ff]" /> {t("legendEvents")}</span>
            </div>
          </div>
          <ActivityChart data={data.daily_activity} />
        </div>

        <div className="cc-card p-5">
          <h3 className="font-semibold">{t("roleDistribution")}</h3>
          <ul className="mt-4 space-y-3">
            {data.role_summary.length === 0 ? (
              <li className="text-sm text-[var(--cc-muted)]">{t("noRoles")}</li>
            ) : (
              data.role_summary.slice(0, 6).map((row) => (
                <li key={row.slug}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{row.name || row.slug}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--cc-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--cc-accent)]"
                      style={{ width: `${Math.min(100, (row.count / Math.max(data.stats.users_total, 1)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
          <Link href="/dashboard/roles" className="mt-4 inline-block text-xs text-[var(--cc-accent)] hover:underline">
            {t("manageRoles")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cc-card overflow-hidden">
          <div className="border-b border-[var(--cc-border)] px-5 py-4">
            <h3 className="font-semibold">{t("recentUsersTitle")}</h3>
          </div>
          <table className="cc-table w-full text-sm">
            <thead>
              <tr>
                <th>{t("colUser")}</th>
                <th>{t("colEmail")}</th>
                <th>{t("colTime")}</th>
              </tr>
            </thead>
            <tbody>
              {data.client_permissions.slice(0, 6).map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td className="text-[var(--cc-muted)]">{user.email}</td>
                  <td className="text-[var(--cc-muted)]">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cc-card overflow-hidden">
          <div className="border-b border-[var(--cc-border)] px-5 py-4">
            <h3 className="font-semibold">{t("activeFlagsTitle")}</h3>
          </div>
          <table className="cc-table w-full text-sm">
            <thead>
              <tr>
                <th>{t("colFeature")}</th>
                <th>{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {data.feature_flags.map((flag) => (
                <tr key={flag.key}>
                  <td>{flag.slug}</td>
                  <td>
                    <span className={`cc-badge ${flag.enabled ? "cc-badge--ok" : "cc-badge--off"}`}>
                      {flag.enabled ? t("active") : t("inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
