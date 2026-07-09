"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { ControlCenterData } from "@/lib/api/dashboard";

export function RecentChangesPanel({ data }: { data: ControlCenterData }) {
  const t = useTranslations("controlCenter");

  return (
    <div className="cc-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--cc-border)] px-5 py-4">
        <div>
          <h3 className="font-semibold">{t("recentChangesTitle")}</h3>
          <p className="mt-1 text-sm text-[var(--cc-muted)]">{t("recentChangesHint")}</p>
        </div>
        <Link href="/dashboard/audit" className="text-xs text-[var(--cc-accent)] hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <table className="cc-table w-full text-sm">
        <thead>
          <tr>
            <th>{t("colAction")}</th>
            <th>{t("colUser")}</th>
            <th>{t("colResource")}</th>
            <th>{t("colTime")}</th>
          </tr>
        </thead>
        <tbody>
          {data.recent_changes.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-[var(--cc-muted)]">
                {t("noChanges")}
              </td>
            </tr>
          ) : (
            data.recent_changes.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.action}</td>
                <td>{row.user_email || "—"}</td>
                <td className="text-[var(--cc-muted)]">{row.resource_type || "—"}</td>
                <td className="text-[var(--cc-muted)]">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
