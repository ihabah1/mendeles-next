"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { getAccessToken } from "@/lib/api/auth";
import { socialApi } from "@/lib/api/social";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("he-IL");
  } catch {
    return value;
  }
}

export default function CampaignReportPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("automation.view");

  const report = useQuery({
    queryKey: ["campaign-report"],
    queryFn: () => socialApi.campaignReport(false),
    enabled: canView,
  });

  async function downloadCsv() {
    const token = getAccessToken();
    const res = await fetch(socialApi.campaignReportExportUrl(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error("הורדת ה־CSV נכשלה");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-traffic-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין הרשאה לצפות בדוח הקמפיינים.</p>
      </Card>
    );
  }

  const rows = report.data?.rows || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6F42F5]">Reports</p>
          <h1 className="text-3xl font-extrabold tracking-tight">דוח כניסות אחרי פרסום קמפיין</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-fg)]">
            שם הקמפיין, תאריך ושעת הפרסום, ומספר הכניסות לאתר (Sessions) לפי UTM מ־Google Analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/ai-automation">
            <Button type="button" variant="outline" className="rounded-full">
              חזרה לאוטומציית קמפיין
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={report.isFetching}
            onClick={() => report.refetch()}
          >
            {report.isFetching ? "מרענן…" : "רענון דוח"}
          </Button>
          <Button type="button" className="rounded-full bg-[#6F42F5] text-white" onClick={() => downloadCsv()}>
            הורד CSV
          </Button>
        </div>
      </div>

      <Card className="space-y-2 !rounded-2xl">
        <p className="text-sm">
          <span className="font-semibold">GA4: </span>
          {report.data?.ga4_connected ? (
            <span className="text-emerald-700 dark:text-emerald-300">מחובר</span>
          ) : (
            <span className="text-amber-700 dark:text-amber-300">לא מחובר / אין נתונים</span>
          )}
        </p>
        {report.data?.ga4_error ? (
          <p className="text-sm text-red-600">{report.data.ga4_error}</p>
        ) : null}
        <p className="text-xs text-[var(--muted-fg)]">{report.data?.ga4_note}</p>
        <p className="text-xs text-[var(--muted-fg)]">
          איפה מפיקים את הדוח: תפריט אדמין → תוכן → <strong>דוח קמפיינים</strong>, או מכפתור באוטומציית
          קמפיין. לייחוס כניסות יש לחבר GA4 תחת הגדרות → אינטגרציות Google.
        </p>
      </Card>

      <Card className="overflow-x-auto !rounded-2xl !p-0">
        <table className="w-full min-w-[860px] text-start text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-xs uppercase tracking-wide text-[var(--muted-fg)]">
            <tr>
              <th className="px-4 py-3">שם הקמפיין</th>
              <th className="px-4 py-3">תאריך ושעה</th>
              <th className="px-4 py-3">סטטוס</th>
              <th className="px-4 py-3">רשתות</th>
              <th className="px-4 py-3">כניסות (Sessions)</th>
              <th className="px-4 py-3">צפיות דף</th>
            </tr>
          </thead>
          <tbody>
            {report.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted-fg)]">
                  טוען דוח…
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.campaign_id} className="border-b border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{row.campaign_name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.event_at)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-bold uppercase">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">{(row.platforms || []).join(", ")}</td>
                <td className="px-4 py-3 font-semibold">
                  {row.visits_available ? row.sessions : "—"}
                </td>
                <td className="px-4 py-3">{row.visits_available ? row.pageviews : "—"}</td>
              </tr>
            ))}
            {!report.isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted-fg)]">
                  אין עדיין קמפיינים שפורסמו או תוזמנו.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {report.data?.totals ? (
        <p className="text-sm text-[var(--muted-fg)]">
          סה״כ קמפיינים: {report.data.totals.campaigns} · Sessions מיוחסים: {report.data.totals.sessions} ·
          Pageviews: {report.data.totals.pageviews}
        </p>
      ) : null}
    </div>
  );
}
