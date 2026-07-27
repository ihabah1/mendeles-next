"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import { aiSeoApi } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { pageLocale } from "@/components/workspace/workspace-helpers";
import { GoogleLoginsWeek } from "@/components/traffic/google-logins-week";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TrafficTrackingPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("ai_seo.view");
  const canManage = hasPermission("ai_seo.manage");
  const canViewUsers = hasPermission("users.view");
  const qc = useQueryClient();

  const workspace = useQuery({
    queryKey: ["ai-seo-workspace"],
    queryFn: aiSeoApi.workspace,
    enabled: canView,
    refetchInterval: 30000,
  });

  const deletePage = useMutation({
    mutationFn: (pageId: string) => aiSeoApi.deleteWorkspacePage(pageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-workspace"] }),
  });

  function confirmDeletePage(pageId: string, title: string) {
    if (window.confirm(`למחוק את הדף "${title}"? הפעולה תסיר אותו מרשימת הדפים והתוצרים.`)) {
      deletePage.mutate(pageId);
    }
  }

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין לך הרשאה לצפות במעקב תנועה.</p>
      </Card>
    );
  }

  const publishedPages = (workspace.data?.drafts ?? []).filter((page) => page.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">מעקב תנועה לתוצרים שעלו</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">
            ריכוז לינקים שפורסמו, ומדד כניסות משתמשים דרך Google על ציר זמן של שבוע. מדדי עמודים מ-GA4 יוצגו אחרי סנכרון.
          </p>
        </div>
        <Link href="/dashboard/workspace">
          <Button type="button" variant="outline">חזרה לממשק עבודה</Button>
        </Link>
      </div>

      <GoogleLoginsWeek enabled={canViewUsers} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">לינקים חיים</h2>
            <p className="text-xs text-[var(--muted-fg)]">מוצגים רק דפים בסטטוס published.</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-500">
            {publishedPages.length} פורסמו
          </span>
        </div>

        {workspace.isLoading ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">טוען לינקים...</p>
        ) : publishedPages.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted-fg)]">אין עדיין מאמרים או דפי נחיתה שפורסמו.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {publishedPages.map((page) => (
              <li key={page.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{page.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">
                    {page.page_type} · {page.locale === "en" ? "אנגלית" : "עברית"} · פורסם{" "}
                    {page.published_at ? new Date(page.published_at).toLocaleString("he-IL") : "ללא תאריך פרסום"}
                  </p>
                  <code className="mt-2 block truncate rounded bg-[var(--muted)] px-2 py-1 text-xs">
                    {page.full_path || "ללא path"}
                  </code>
                  <p className="mt-2 text-xs text-amber-500">
                    מדדי תנועה: ממתין לסנכרון נתונים אמיתיים מ-GA4/Search Console.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {page.full_path && (
                    <Link href={page.full_path} locale={pageLocale(page.locale)}>
                      <Button type="button" size="sm">פתח דף חי</Button>
                    </Link>
                  )}
                  <Link href={page.test_url}>
                    <Button type="button" variant="outline" size="sm">פתח בניהול תוכן</Button>
                  </Link>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletePage.isPending}
                      onClick={() => confirmDeletePage(page.id, page.title)}
                    >
                      מחק דף
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
