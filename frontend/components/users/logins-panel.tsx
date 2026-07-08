"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { ExpandableStatCard } from "@/components/admin/expandable-stat-card";
import { usersHubApi } from "@/lib/api/dashboard";

export function LoginsPanel() {
  const t = useTranslations("usersHub");
  const tc = useTranslations("common");
  const hub = useQuery({ queryKey: ["users-hub"], queryFn: () => usersHubApi.get() });

  if (hub.isLoading) return <p className="text-sm">{tc("loading")}</p>;
  if (hub.isError) return <p className="text-sm text-red-600">{t("loadError")}</p>;
  const data = hub.data!;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-fg)]">
        {data.scope === "platform" ? t("scopePlatform") : t("scopeTenant")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExpandableStatCard
          label={t("logins24h")}
          value={data.stats.logins_24h}
          hint={t("loginsPeriod", { n: data.stats.logins_period })}
          accent
          daily={data.daily_logins}
          dailyLabel={t("dailyBreakdown")}
        />
        <ExpandableStatCard
          label={t("uniqueEmails")}
          value={data.stats.unique_emails_period}
          hint={t("days", { n: data.days })}
        />
        <ExpandableStatCard label={t("usersTotal")} value={data.stats.users_total} hint={t("verified", { n: data.stats.users_verified })} />
        <ExpandableStatCard label={t("unverifiedUsers")} value={data.stats.users_unverified} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-semibold">{t("byEmailTitle")}</h3>
          <p className="text-xs text-[var(--muted-fg)]">{t("byEmailHint")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-start text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colEmail")}</th>
                <th className="px-4 py-3 font-medium">{t("colLogins")}</th>
                <th className="px-4 py-3 font-medium">{t("colLastLogin")}</th>
                <th className="px-4 py-3 font-medium">+</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.logins_by_email.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-[var(--muted-fg)]">{t("noLogins")}</td></tr>
              ) : (
                data.logins_by_email.map((row) => (
                  <EmailRow key={row.email} email={row.email} count={row.count} lastLogin={row.last_login} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-semibold">{t("recentLogins")}</h3>
        </div>
        <ul className="divide-y text-sm">
          {data.recent_logins.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{row.user_email || "—"}</p>
                <p className="text-xs text-[var(--muted-fg)]">{row.ip_address || "—"}</p>
              </div>
              <time className="text-xs text-[var(--muted-fg)]">
                {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
              </time>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EmailRow({ email, count, lastLogin }: { email: string; count: number; lastLogin: string | null }) {
  const t = useTranslations("usersHub");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const daily = useQuery({
    queryKey: ["users-hub-email", email],
    queryFn: () => usersHubApi.emailDaily(email),
    enabled: open,
  });

  return (
    <>
      <tr className="hover:bg-[var(--muted)]/30">
        <td className="px-4 py-3 font-medium">{email}</td>
        <td className="px-4 py-3 font-semibold">{count}</td>
        <td className="px-4 py-3 text-[var(--muted-fg)]">
          {lastLogin ? new Date(lastLogin).toLocaleString() : "—"}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-sm font-bold hover:bg-[var(--muted)]"
            aria-expanded={open}
            aria-label={t("dailyBreakdown")}
          >
            {open ? "−" : "+"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="bg-[var(--muted)]/20 px-4 py-3">
            {daily.isLoading && <p className="text-xs">{tc("loading")}</p>}
            {daily.data && (
              <ul className="space-y-1 text-xs">
                {daily.data.daily.map((row) => (
                  <li key={row.date} className="flex justify-between gap-4">
                    <span className="text-[var(--muted-fg)]">
                      {new Date(row.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
