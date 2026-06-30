"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { DEMO_LANDING_PAGES, landingPagePath } from "@/lib/landing/demo-pages";

export default function LandingPagesAdminPage() {
  const t = useTranslations("pages");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)]">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-start text-xs uppercase tracking-wide text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colName")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("colViews")}</th>
                <th className="px-4 py-3 font-medium">{t("colLeads")}</th>
                <th className="px-4 py-3 font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {DEMO_LANDING_PAGES.map((page) => (
                <tr key={page.slug} className="hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t(`demo.${page.nameKey}.headline`)}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{landingPagePath(page.slug)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        page.status === "published"
                          ? "rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs text-[var(--success)]"
                          : "rounded-full bg-[var(--warning)]/10 px-2 py-0.5 text-xs text-[var(--warning)]"
                      }
                    >
                      {page.status === "published" ? t("published") : t("draft")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{page.views.toLocaleString()}</td>
                  <td className="px-4 py-3">{page.leads}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={landingPagePath(page.slug)}
                        target="_blank"
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:opacity-90"
                      >
                        {t("viewPage")}
                      </Link>
                      <Link
                        href={landingPagePath(page.slug)}
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                      >
                        {t("preview")}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-[var(--muted-fg)]">{t("demoNote")}</p>
    </div>
  );
}
