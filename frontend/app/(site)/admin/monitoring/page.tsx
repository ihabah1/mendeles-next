"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import {
  AdminAlert,
  AdminDataTable,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminRefreshButton,
  AdminShell,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
  AdminTwoCol,
} from "@/components/admin/AdminUI";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import {
  monitoringAdminService,
  type AutomationLogRow,
  type AutomationRun,
  type AutomationSource,
  type DrawSnapshot,
  type MonitoringSnapshot,
} from "@/lib/api/monitoring-admin";

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatMoney(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "לא פורסם";
  return `₪${n.toLocaleString("he-IL")}`;
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={`admin-status-badge${ok ? " admin-status-badge--ok" : " admin-status-badge--fail"}`}>
      {ok ? "✓ הצלחה" : "✗ כשל"}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

export default function AdminMonitoringPage() {
  return (
    <ProtectedRoute adminOnly>
      <MonitoringPageInner />
    </ProtectedRoute>
  );
}

function MonitoringPageInner() {
  const [snap, setSnap] = useState<MonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSnap(await monitoringAdminService.snapshot());
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת ניטור"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const res = await monitoringAdminService.runDailySync();
      setSnap(res.snapshot);
      setMessage(res.detail);
    } catch (e) {
      setError(extractApiError(e, "סנכרון נכשל"));
    } finally {
      setSyncing(false);
    }
  };

  const auto = snap?.automation;
  const draw = snap?.draw;

  return (
    <>
      <Nav />
      <AdminShell>
        <AdminNavTabs active="monitoring" />
        <AdminPageHeader
          title="ניטור תשתית"
          description="אוטומציה יומית, קבצי מקור, הגרלות וזכייה, תנועה באתר ושירותים."
          actions={
            <AdminToolbar>
              <AdminRefreshButton onClick={load} loading={loading} />
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={runSync}
                disabled={syncing}
                aria-busy={syncing}
              >
                {syncing ? "מריץ סנכרון…" : "הרץ סנכרון ידני"}
              </button>
            </AdminToolbar>
          }
        />

        {error && <AdminAlert type="error">{error}</AdminAlert>}
        {message && <AdminAlert type="success">{message}</AdminAlert>}

        {loading && !snap ? (
          <AdminLoading label="טוען נתוני ניטור…" />
        ) : snap ? (
          <>
            <nav className="admin-toc" aria-label="קפיצה לסעיף">
              <a href="#admin-draw">הגרלה וזכייה</a>
              <a href="#admin-automation">אוטומציה</a>
              <a href="#admin-stats">סטטיסטיקות</a>
              <a href="#admin-services">שירותים</a>
              <a href="#admin-traffic">תנועה</a>
            </nav>

            {draw && <DrawSection draw={draw} />}

            {auto && <AutomationSection automation={snap.automation} onRunSync={runSync} syncing={syncing} />}

            <section id="admin-stats" aria-labelledby="stats-heading">
              <h2 id="stats-heading" className="sr-only">
                סטטיסטיקות מהירות
              </h2>
              <AdminStatGrid>
                <AdminStatCard label="משתמשים רשומים" value={String(snap.users.total)} sub={`+${snap.users.newToday} נרשמו היום`} />
                <AdminStatCard label="כניסות היום" value={String(snap.traffic.pageViewsToday)} sub={`${snap.traffic.uniqueVisitorsToday} מבקרים ייחודיים`} />
                <AdminStatCard label="הזמנות היום" value={String(snap.traffic.ordersToday)} sub={`${snap.business.totalOrders} הזמנות סה״כ`} />
                <AdminStatCard label="שיחות צ׳אט היום" value={String(snap.traffic.chatSessionsToday)} sub={`${snap.chatInquiriesOpen} ביקשו נציג`} />
                <AdminStatCard label="צירופים פנויים" value={String(snap.comboPool.free)} sub={`${snap.comboPool.percentUsed}% כבר בשימוש`} />
                <AdminStatCard
                  label="ריצות אוטומציה"
                  value={String(auto?.stats.successCount ?? 0)}
                  sub={`${auto?.stats.failCount ?? 0} כשלונות`}
                  accent={auto?.stats.failCount ? "#ffb347" : undefined}
                />
              </AdminStatGrid>
            </section>

            <AdminTwoCol>
              <AdminPanel id="admin-services" title="שירותים ועלויות" defaultOpen>
                {snap.services.map((s) => (
                  <div key={s.key} className="admin-service-row">
                    <span>{s.label}</span>
                    <span className={s.configured ? "admin-status-ok" : "admin-status-off"}>
                      {s.configured ? "מחובר" : s.hint || "לא מוגדר"}
                    </span>
                  </div>
                ))}
              </AdminPanel>

              <AdminPanel title="כל הקבצים במערכת" defaultOpen>
                {snap.files.map((f) => (
                  <div key={f.name} className="admin-file-row">
                    <strong>{f.name}</strong>
                    {f.exists ? ` — ${f.sizeMb} MB` : " — לא נמצא"}
                    {f.rowCount != null ? ` · ${f.rowCount} שורות` : ""}
                    {f.updatedAt ? ` · עודכן ${formatDt(f.updatedAt)}` : ""}
                  </div>
                ))}
              </AdminPanel>
            </AdminTwoCol>

            <AdminPanel id="admin-integrations" title="לוג אינטגרציות (iCount / הדפסה)" badge={snap.integrations.length}>
              <LogList rows={snap.integrations} type="integration" />
            </AdminPanel>

            <AdminPanel id="admin-traffic" title="תנועה — 7 ימים אחרונים">
              {snap.traffic.daily.length ? (
                <AdminDataTable
                  caption="תנועה באתר בשבוע האחרון"
                  headers={["תאריך", "כניסות", "מבקרים ייחודיים", "הזמנות", "שיחות צ׳אט"]}
                  rows={snap.traffic.daily.map((d) => [
                    d.date,
                    d.pageViews,
                    d.uniqueVisitors,
                    d.orders,
                    d.chatSessions,
                  ])}
                />
              ) : (
                <AdminEmpty title="אין נתוני תנועה עדיין" hint="המונה יתמלא לאחר כניסות לאתר" />
              )}
            </AdminPanel>
          </>
        ) : (
          <AdminEmpty
            title={error ? "שגיאה בטעינת ניטור" : "לא ניתן לטעון נתונים"}
            hint={error || "נסה לרענן או לבדוק חיבור לשרת Django"}
          />
        )}
      </AdminShell>
    </>
  );
}

function DrawSection({ draw }: { draw: DrawSnapshot }) {
  const nums = draw.numbers ?? [];
  return (
    <section id="admin-draw" aria-labelledby="draw-heading" style={{ marginBottom: 14 }}>
      <AdminPanel title="הגרלה וזכייה" defaultOpen>
        <h2 id="draw-heading" className="sr-only">
          הגרלה וזכייה
        </h2>
        <div className="admin-draw-hero">
          <div className="admin-draw-block card">
            <div className="admin-draw-label">הגרלה הבאה (לוטו ישראל)</div>
            {draw.nextDraw.dayName && draw.nextDraw.date ? (
              <>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--cream)" }}>
                  {draw.nextDraw.dayName} · {draw.nextDraw.date} · {draw.nextDraw.time}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
                  {draw.nextDraw.at ? formatDt(draw.nextDraw.at) : ""}
                </div>
              </>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>לא זוהתה הגרלה קרובה</div>
            )}
          </div>

          <div className="admin-draw-block card">
            <div className="admin-draw-label">גודל זכייה ראשית (6+חזק)</div>
            <div className="admin-draw-jackpot">{formatMoney(draw.jackpotIls)}</div>
            {draw.jackpotWinners > 0 && (
              <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4 }}>
                {draw.jackpotWinners} זוכים בהגרלה האחרונה
              </div>
            )}
          </div>
        </div>

        <div className="card admin-draw-block" style={{ marginBottom: 12 }}>
          <div className="admin-draw-label">
            הגרלה קודמת #{draw.lotteryId ?? "—"}
            {draw.date ? ` · ${draw.date}` : ""}
          </div>
          {nums.length === 6 ? (
            <div className="admin-lotto-balls" aria-label="מספרים זוכים">
              {nums.map((n) => (
                <span key={n} className="admin-lotto-ball">
                  {n}
                </span>
              ))}
              {draw.strong != null && (
                <span className="admin-lotto-ball admin-lotto-ball--strong" title="חזק">
                  {draw.strong}
                </span>
              )}
            </div>
          ) : (
            <AdminEmpty title="אין מספרים זוכים בקובץ" hint="הרץ סנכרון יומי לעדכון מפיס" />
          )}
          <p style={{ fontSize: ".68rem", color: "var(--muted)", margin: "10px 0 0" }}>
            מקור: {draw.sourceFile}
            {draw.updatedAt ? ` · עודכן ${formatDt(draw.updatedAt)}` : ""}
          </p>
        </div>

        {Object.keys(draw.prizes).length > 0 && (
          <AdminDataTable
            caption="טבלת פרסים בהגרלה האחרונה"
            headers={["דרגה", "סכום זכייה", "מספר זוכים"]}
            rows={Object.entries(draw.prizes).map(([, p]) => [p.name, formatMoney(p.ils), p.winners])}
          />
        )}
      </AdminPanel>
    </section>
  );
}

function AutomationSection({
  automation,
  onRunSync,
  syncing,
}: {
  automation: MonitoringSnapshot["automation"];
  onRunSync: () => void;
  syncing: boolean;
}) {
  const last = automation.lastDailySync;
  return (
    <section id="admin-automation" aria-labelledby="auto-heading" style={{ marginBottom: 14 }}>
      <AdminPanel title="אוטומציה יומית — סנכרון מפיס ומאגר" badge={automation.runs.length} defaultOpen>
        <h2 id="auto-heading" className="sr-only">
          אוטומציה
        </h2>

        {automation.warning && <AdminAlert type="info">{automation.warning}</AdminAlert>}

        <div className="admin-kv-grid">
          <Kv label="תזמון Cron" value={automation.schedule.cronLabel} />
          <Kv label="ריצה הבאה" value={formatDt(automation.schedule.nextRunAtLocal)} />
          <Kv label="פקודה" value={automation.schedule.command} />
          <Kv
            label="ריצה אחרונה"
            value={
              last.at ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {formatDt(last.at)}
                  <StatusBadge ok={last.success} />
                </span>
              ) : (
                "טרם רצה"
              )
            }
          />
          <Kv label="משך ריצה" value={last.durationMs != null ? `${last.durationMs} ms` : "—"} />
          <Kv label="שורות ב-CSV (סה״כ)" value={String(last.csvTotalRows ?? "—")} />
          <Kv label="שורות בריצה האחרונה" value={String(last.recordsWritten)} />
          <Kv
            label="מאגר אחרי ריצה"
            value={
              last.combos.total != null
                ? `${last.combos.free ?? 0} פנויים / ${last.combos.total} סה״כ`
                : "—"
            }
          />
          <Kv label="הגרלה שעודכנה" value={last.drawLotteryId ? String(last.drawLotteryId) : "—"} />
          <Kv
            label="סטטיסטיקת ריצות"
            value={`${automation.stats.successCount} הצלחות · ${automation.stats.failCount} כשלונות`}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-gold btn-sm" onClick={onRunSync} disabled={syncing} aria-busy={syncing}>
            {syncing ? "מריץ…" : "הרץ סנכרון ידני עכשיו"}
          </button>
        </div>

        <h3 style={{ fontSize: ".82rem", color: "var(--cream)", margin: "0 0 8px" }}>קבצי מקור</h3>
        {automation.sources.map((src) => (
          <SourceCard key={src.key} source={src} />
        ))}

        <h3 style={{ fontSize: ".82rem", color: "var(--cream)", margin: "16px 0 8px" }}>היסטוריית ריצות (סנכרון יומי)</h3>
        {automation.runs.length ? (
          <AdminDataTable
            caption="היסטוריית ריצות סנכרון יומי"
            headers={["זמן", "סטטוס", "משך", "שורות", "צירופים פנויים", "הגרלה", "הודעה"]}
            rows={automation.runs.map((r) => runRow(r))}
          />
        ) : (
          <AdminEmpty title="אין ריצות מתועדות" hint="הרץ סנכרון ידני או הגדר Railway Cron" />
        )}

        <h3 style={{ fontSize: ".82rem", color: "var(--cream)", margin: "16px 0 8px" }}>כל לוגי האוטומציה</h3>
        <LogList rows={automation.logs} type="automation" />
      </AdminPanel>
    </section>
  );
}

function runRow(r: AutomationRun): (string | number)[] {
  const free = r.combos.free;
  const total = r.combos.total;
  return [
    formatDt(r.at),
    r.success ? "הצלחה" : "כשל",
    r.durationMs != null ? `${r.durationMs} ms` : "—",
    r.recordsWritten,
    free != null && total != null ? `${free}/${total}` : "—",
    r.drawLotteryId != null ? r.drawLotteryId : "—",
    r.message,
  ];
}

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="admin-kv">
      <div className="admin-kv-label">{label}</div>
      <div className="admin-kv-value">{value}</div>
    </div>
  );
}

function SourceCard({ source }: { source: AutomationSource }) {
  return (
    <div className="admin-source-card">
      <h3>{source.label}</h3>
      {source.role && <div className="admin-source-meta">{source.role}</div>}
      <div className="admin-source-meta">
        <div>נתיב: <code style={{ fontSize: ".62rem" }}>{source.path}</code></div>
        <div>
          {source.exists ? (
            <>
              {source.sizeMb != null ? `${source.sizeMb} MB` : "גודל לא זמין"}
              {source.rowCount != null ? ` · ${source.rowCount.toLocaleString("he-IL")} רשומות` : ""}
              {source.updatedAt ? ` · עודכן ${formatDt(source.updatedAt)}` : ""}
            </>
          ) : (
            "קובץ לא קיים — ייווצר בריצה הראשונה"
          )}
        </div>
      </div>
    </div>
  );
}

function LogList({
  rows,
  type,
}: {
  rows: AutomationLogRow[] | MonitoringSnapshot["integrations"];
  type: "automation" | "integration";
}) {
  if (!rows.length) {
    return <AdminEmpty title="אין רשומות ביומן" />;
  }
  return (
    <div className="admin-log-list" role="log" aria-label="יומן אירועים">
      {rows.map((row) => {
        const level = "level" in row ? row.level : "info";
        const msg = "message" in row ? row.message : "";
        const at = "createdAt" in row ? row.createdAt : "";
        const jobLabel =
          type === "automation" && "jobLabel" in row && row.jobLabel
            ? row.jobLabel
            : type === "automation" && "job" in row
              ? row.job
              : "";
        const duration =
          type === "automation" && "durationMs" in row && row.durationMs != null
            ? ` · ${row.durationMs}ms`
            : "";
        const details =
          type === "automation" && "details" in row && Object.keys(row.details || {}).length > 0
            ? row.details
            : null;
        return (
          <div
            key={row.id}
            className={`admin-log-item${level === "error" ? " admin-log-item--error" : " admin-log-item--ok"}`}
          >
            <div className="admin-log-row">
              <span>
                {level === "error" ? (
                  <StatusBadge ok={false} />
                ) : (
                  <StatusBadge ok={level !== "warning"} />
                )}{" "}
                <span style={{ color: level === "error" ? "#ff6b7a" : "var(--text)" }}>{msg}</span>
              </span>
              <time dateTime={at} style={{ color: "var(--muted)", flexShrink: 0 }}>
                {formatDt(at)}
              </time>
            </div>
            {jobLabel && (
              <div style={{ color: "var(--muted)", marginTop: 4, fontSize: ".66rem" }}>
                {jobLabel}
                {duration}
              </div>
            )}
            {details && (
              <details style={{ marginTop: 6, fontSize: ".64rem", color: "var(--muted)" }}>
                <summary style={{ cursor: "pointer" }}>פרטי ריצה</summary>
                <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {JSON.stringify(details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
