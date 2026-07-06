"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { AccessibilityIcon } from "@/components/a11y/accessibility-icon";

type AuditPage = {
  url: string;
  path: string;
  locale: string;
  status_code: number | null;
  ok: boolean;
  checks?: Record<string, boolean>;
  issues?: string[];
  error?: string;
};

type AuditReport = {
  audited_at?: string;
  total_pages?: number;
  passed_pages?: number;
  failed_pages?: number;
  all_passed?: boolean;
  pages?: AuditPage[];
};

export function AccessibilityAuditReport({ report }: { report: AuditReport }) {
  const t = useTranslations("automation.accessibilityAudit");
  const pages = report.pages ?? [];

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
          <AccessibilityIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] p-3">
          <dt className="text-xs text-[var(--muted-fg)]">{t("totalPages")}</dt>
          <dd className="text-lg font-semibold">{report.total_pages ?? pages.length}</dd>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <dt className="text-xs text-emerald-700 dark:text-emerald-300">{t("passed")}</dt>
          <dd className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {report.passed_pages ?? pages.filter((p) => p.ok).length}
          </dd>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
          <dt className="text-xs text-red-700 dark:text-red-300">{t("failed")}</dt>
          <dd className="text-lg font-semibold text-red-700 dark:text-red-300">
            {report.failed_pages ?? pages.filter((p) => !p.ok).length}
          </dd>
        </div>
      </dl>

      {pages.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-start">
                <th className="p-2">{t("path")}</th>
                <th className="p-2">{t("locale")}</th>
                <th className="p-2">{t("status")}</th>
                <th className="p-2">{t("issues")}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={`${page.locale}-${page.path}`} className="border-b border-[var(--border)]">
                  <td className="p-2 font-mono text-xs">{page.path}</td>
                  <td className="p-2">{page.locale}</td>
                  <td className="p-2">
                    <span
                      className={
                        page.ok
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200"
                      }
                    >
                      {page.ok ? t("ok") : t("fail")}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-[var(--muted-fg)]">
                    {page.error || (page.issues?.length ? page.issues.join(", ") : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function isAccessibilityAuditReport(value: unknown): value is AuditReport {
  return Boolean(value && typeof value === "object" && "pages" in (value as AuditReport));
}
