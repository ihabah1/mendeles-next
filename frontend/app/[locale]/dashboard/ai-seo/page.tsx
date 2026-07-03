"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/i18n/navigation";
import { aiSeoApi, type AiSeoDashboard, type AiSeoKpi, type AiSeoServiceFlag } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SERVICE_LABELS: Record<string, string> = {
  search_console: "Google Search Console",
  analytics: "Google Analytics 4",
  trends: "Google Trends",
  ai_provider: "AI Provider",
};

const SERVICE_LINKS: Record<string, string> = {
  search_console: "/dashboard/settings/integrations/google",
  analytics: "/dashboard/settings/integrations/google",
  trends: "/dashboard/settings/integrations/google",
  ai_provider: "/dashboard/settings",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "מחובר",
  waiting_authorization: "ממתין לאישור",
  config_required: "דורש קינפוג",
  not_connected: "לא מחובר",
  not_configured: "לא מוגדר",
  error: "שגיאה",
};

const FUNNEL_LABELS: Record<string, string> = {
  impressions: "תצוגות",
  clicks: "קליקים",
  leads: "לידים",
  qualified: "שיחות / פניות",
  converted: "לקוחות",
};

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "לא זמין";
  return new Intl.NumberFormat("he-IL").format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("he-IL") : "לא סונכרן";
}

function kpiValue(kpi: AiSeoKpi): string {
  if (!kpi.available) return "לא זמין";
  return formatNumber(kpi.value);
}

function serviceTone(service: AiSeoServiceFlag): string {
  if (service.connected) return "border-emerald-500/40 bg-emerald-500/10";
  if (service.status === "waiting_authorization" || service.status === "config_required" || service.status === "not_configured") {
    return "border-amber-500/40 bg-amber-500/10";
  }
  return "border-red-500/40 bg-red-500/10";
}

function ServiceFlag({ service }: { service: AiSeoServiceFlag }) {
  const label = SERVICE_LABELS[service.id] ?? service.id;
  const status = STATUS_LABELS[service.status] ?? service.status;

  return (
    <Link href={SERVICE_LINKS[service.id] ?? "/dashboard/settings"} className="block">
      <div className={`h-full rounded-xl border p-4 transition hover:opacity-90 ${serviceTone(service)}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-[var(--muted-fg)]">{status}</p>
          </div>
          <span className="text-lg" aria-hidden="true">
            {service.connected ? "🟢" : service.requires_action ? "🟡" : "🔴"}
          </span>
        </div>
        <p className="mt-3 text-xs text-[var(--muted-fg)]">
          {service.property_label || service.last_error || "לחץ להגדרה / בדיקת חיבור"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-fg)]">סנכרון אחרון: {formatDate(service.last_sync_at)}</p>
      </div>
    </Link>
  );
}

function KpiCard({
  label,
  kpi,
  hint,
  accent,
}: {
  label: string;
  kpi: AiSeoKpi;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-[var(--accent)]/40 bg-[var(--accent-muted)]/30" : undefined}>
      <p className="text-xs font-medium text-[var(--muted-fg)]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{kpiValue(kpi)}</p>
      <p className="mt-1 text-xs text-[var(--muted-fg)]">
        {kpi.change_pct !== null && kpi.change_pct !== undefined ? (
          <span className={kpi.change_pct >= 0 ? "text-emerald-600" : "text-red-600"}>{formatPct(kpi.change_pct)} </span>
        ) : null}
        {hint || (kpi.available ? "נתון אמיתי מהמערכת" : "דורש מקור נתונים מחובר")}
      </p>
    </Card>
  );
}

function OrganicChart({ organic }: { organic: AiSeoDashboard["organic"] }) {
  const points = organic.series ?? [];
  const maxValue = Math.max(...points.map((p) => Math.max(p.clicks, p.impressions)), 1);

  if (!organic.available || points.length === 0) {
    return (
      <Card>
        <h2 className="font-semibold">ביצועים אורגניים</h2>
        <p className="mt-4 text-sm text-[var(--muted-fg)]">
          אין עדיין נתוני Search Console מסונכרנים. חבר Search Console ולחץ רענון.
        </p>
        <Link href="/dashboard/settings/integrations/google" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
          פתח אינטגרציות Google
        </Link>
      </Card>
    );
  }

  const clickPath = points
    .map((p, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - (p.clicks / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const impressionPath = points
    .map((p, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - (p.impressions / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">ביצועים אורגניים</h2>
          <p className="text-xs text-[var(--muted-fg)]">סנכרון אחרון: {formatDate(organic.last_sync_at)}</p>
        </div>
        <Link href="/dashboard/settings/integrations/google" className="text-xs text-[var(--accent)] hover:underline">
          Search Console
        </Link>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-6 h-48 w-full overflow-visible">
        <polyline points={impressionPath} fill="none" stroke="rgb(124 58 237)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <polyline points={clickPath} fill="none" stroke="rgb(37 99 235)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MiniMetric label="CTR" value={organic.summary.ctr != null ? `${((organic.summary.ctr as number) * 100).toFixed(2)}%` : "לא זמין"} />
        <MiniMetric label="מיקום ממוצע" value={organic.summary.position != null ? (organic.summary.position as number).toFixed(1) : "לא זמין"} />
        <MiniMetric label="קליקים" value={formatNumber(organic.summary.clicks as number | undefined)} />
        <MiniMetric label="תצוגות" value={formatNumber(organic.summary.impressions as number | undefined)} />
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3">
      <p className="text-xs text-[var(--muted-fg)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function HotKeywords({ data }: { data: AiSeoDashboard["hot_keywords"] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">מילות מפתח חמות</h2>
          <p className="text-xs text-[var(--muted-fg)]">Google Trends / Search Console</p>
        </div>
        <Link href="/dashboard/settings/integrations/google" className="text-xs text-[var(--accent)] hover:underline">
          חקר מילים מלא
        </Link>
      </div>
      {!data.available ? (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">אין נתוני Trends או Search Console. לחץ רענון אחרי חיבור השירותים.</p>
      ) : (
        <ul className="mt-4 divide-y text-sm">
          {data.items.slice(0, 8).map((item) => (
            <li key={`${item.source}-${item.keyword}`} className="flex items-center justify-between gap-3 py-2">
              <span className="font-medium">{item.keyword}</span>
              <span className="text-xs text-[var(--muted-fg)]">
                {item.volume != null ? formatNumber(item.volume) : item.source}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LeadFunnel({ funnel }: { funnel: AiSeoDashboard["lead_funnel"] }) {
  const maxValue = Math.max(...funnel.stages.map((s) => s.value), 1);

  return (
    <Card>
      <h2 className="font-semibold">משפך לידים</h2>
      {!funnel.available ? (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">אין עדיין נתוני משפך אמיתיים.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {funnel.stages.map((stage) => (
            <div key={stage.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{FUNNEL_LABELS[stage.label] ?? stage.label}</span>
                <span>{formatNumber(stage.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--muted)]">
                <div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(3, (stage.value / maxValue) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AutomationTasks({ tasks }: { tasks: AiSeoDashboard["automation_tasks"] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">משימות אוטומציה פעילות</h2>
        <Link href="/dashboard/automation" className="text-xs text-[var(--accent)] hover:underline">
          הצג הכל
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">אין משימות אוטומציה עדיין.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/dashboard/automation/${task.id}`} className="font-medium hover:underline">
                  {task.name}
                </Link>
                <span className="text-xs text-[var(--muted-fg)]">{task.status}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[var(--muted)]">
                <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${task.progress_percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ContentReview({ review }: { review: AiSeoDashboard["content_review"] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">תוכן ממתין לאישור</h2>
          <p className="text-xs text-[var(--muted-fg)]">{review.waiting_count} פריטים בבדיקה</p>
        </div>
        <Link href="/dashboard/content" className="text-xs text-[var(--accent)] hover:underline">
          למרכז התוכן
        </Link>
      </div>
      {review.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">אין טיוטות או תוכן שממתין לאישור.</p>
      ) : (
        <ul className="mt-4 divide-y text-sm">
          {review.items.slice(0, 6).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-[var(--muted-fg)]">{item.page_type}</p>
              </div>
              <span className="rounded bg-[var(--muted)] px-2 py-1 text-xs">{item.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AiSeoDashboardPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("ai_seo.view");
  const canManage = hasPermission("ai_seo.manage");
  const qc = useQueryClient();

  const dashboard = useQuery({
    queryKey: ["ai-seo-dashboard"],
    queryFn: aiSeoApi.dashboard,
    enabled: canView,
  });

  const refresh = useMutation({
    mutationFn: () => aiSeoApi.refresh("all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-seo-dashboard"] }),
  });

  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted-fg)]">אין לך הרשאה לצפות ב-AI SEO Automation Center.</p>
      </Card>
    );
  }

  const data = dashboard.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI SEO Automation Center</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">מרכז השליטה לפעילות SEO, תוכן, לידים ואוטומציה.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings/integrations/google">
            <Button type="button" variant="outline">אינטגרציות Google</Button>
          </Link>
          {canManage && (
            <Button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              {refresh.isPending ? "מרענן..." : "רענן נתונים"}
            </Button>
          )}
        </div>
      </div>

      {dashboard.isLoading && <p className="text-sm text-[var(--muted-fg)]">טוען נתונים אמיתיים...</p>}
      {dashboard.isError && <p className="text-sm text-red-600">לא ניתן לטעון את מרכז האוטומציה.</p>}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.services.map((service) => (
              <ServiceFlag key={service.id} service={service} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="הכנסות מלידים" kpi={data.kpis.lead_revenue} hint="לא מחושב בלי מקור הכנסות מחובר" />
            <KpiCard label="לידים חדשים" kpi={data.kpis.new_leads} hint="30 ימים אחרונים" accent />
            <KpiCard label="קליקים אורגניים" kpi={data.kpis.organic_clicks} />
            <KpiCard label="תצוגות" kpi={data.kpis.impressions} />
            <KpiCard label="מיקומים בעמוד 1" kpi={data.kpis.page_one_rankings} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
            <OrganicChart organic={data.organic} />
            <AutomationTasks tasks={data.automation_tasks} />
            <HotKeywords data={data.hot_keywords} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LeadFunnel funnel={data.lead_funnel} />
            <ContentReview review={data.content_review} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="font-semibold">סטטוס מערכת</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <StatusRow label="Database" value={data.system.database} />
                <StatusRow label="Workers" value={`${data.system.workers_busy}/${data.system.workers_total}`} />
                <StatusRow label="Queue" value={String(data.system.queue_size)} />
                <StatusRow label="Waiting approval" value={String(data.system.waiting_approval)} />
              </dl>
            </Card>

            <Card>
              <h2 className="font-semibold">פעולות מהירות</h2>
              <div className="mt-4 grid gap-2">
                <Link href="/dashboard/settings/integrations/google">
                  <Button type="button" variant="outline" className="w-full">רענון Google</Button>
                </Link>
                <Link href="/dashboard/automation">
                  <Button type="button" variant="outline" className="w-full">מרכז אוטומציה</Button>
                </Link>
                <Link href="/dashboard/content">
                  <Button type="button" variant="outline" className="w-full">מרכז תוכן</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">תזכורות</h2>
              {data.reminders.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--muted-fg)]">אין תזכורות כרגע.</p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {data.reminders.map((reminder) => (
                    <li key={reminder.type} className="flex justify-between rounded border border-[var(--border)] px-3 py-2">
                      <span>{reminder.type}</span>
                      <span>{reminder.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--muted-fg)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
