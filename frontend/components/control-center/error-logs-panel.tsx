"use client";

import { useTranslations } from "next-intl";
import type { ControlCenterData } from "@/lib/api/dashboard";

export function ErrorLogsPanel({ data }: { data: ControlCenterData }) {
  const t = useTranslations("controlCenter");

  return (
    <div className="cc-card overflow-hidden">
      <div className="border-b border-[var(--cc-border)] px-5 py-4">
        <h3 className="font-semibold">{t("errorLogsTitle")}</h3>
        <p className="mt-1 text-sm text-[var(--cc-muted)]">{t("errorLogsHint")}</p>
      </div>
      <table className="cc-table w-full text-sm">
        <thead>
          <tr>
            <th>{t("colLevel")}</th>
            <th>{t("colSource")}</th>
            <th>{t("colMessage")}</th>
            <th>{t("colTime")}</th>
          </tr>
        </thead>
        <tbody>
          {data.error_logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-[var(--cc-muted)]">
                {t("noErrors")}
              </td>
            </tr>
          ) : (
            data.error_logs.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className={`cc-badge ${row.level === "error" ? "cc-badge--err" : "cc-badge--warn"}`}>
                    {row.level}
                  </span>
                </td>
                <td>{row.source}</td>
                <td className="max-w-md truncate" title={row.message}>
                  {row.message}
                </td>
                <td className="whitespace-nowrap text-[var(--cc-muted)]">
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
