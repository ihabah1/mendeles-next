"use client";

import { useCallback, useEffect, useState } from "react";
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

  return (
    <>
      <Nav />
      <AdminShell>
        <AdminNavTabs active="monitoring" />
        <AdminPageHeader
          title="ניטור תשתית"
          description="מבט אחד על אוטומציה יומית, תנועה באתר, מאגר צירופים, גדלי קבצים וסטטוס שירותים חיצוניים."
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
                {syncing ? "מריץ סנכרון…" : "הרץ סנכרון יומי"}
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
              <a href="#admin-stats">סטטיסטיקות</a>
              <a href="#admin-services">שירותים</a>
              <a href="#admin-automation">אוטומציה</a>
              <a href="#admin-integrations">אינטגרציות</a>
              <a href="#admin-traffic">תנועה</a>
            </nav>

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
                  label="הגרלה אחרונה"
                  value={snap.draw.lotteryId ? String(snap.draw.lotteryId) : "—"}
                  sub={snap.draw.date || "לא עודכן"}
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
                <p style={{ fontSize: ".68rem", color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
                  עלויות Railway / Gemini / Storage מוצגות כהנחיה — לחיוב מדויק יש לבדוק בלוח הבקרה של כל ספק.
                </p>
              </AdminPanel>

              <AdminPanel title="גדלי קבצים" defaultOpen>
                {snap.files.map((f) => (
                  <div key={f.name} className="admin-file-row">
                    <strong>{f.name}</strong>
                    {f.exists ? ` — ${f.sizeMb} MB` : " — לא נמצא בשרת"}
                  </div>
                ))}
              </AdminPanel>
            </AdminTwoCol>

            <AdminPanel
              id="admin-automation"
              title="לוג אוטומציה — סנכרון יומי"
              badge={snap.automation.logs.length}
            >
              <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "0 0 10px" }}>
                הרצה אחרונה: {formatDt(snap.automation.lastRunAt)} · {snap.automation.lastMessage || "אין הודעה"}
              </p>
              <LogList rows={snap.automation.logs} type="automation" />
            </AdminPanel>

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
          <AdminEmpty title="לא ניתן לטעון נתונים" hint="נסה לרענן או לבדוק חיבור לשרת" />
        )}
      </AdminShell>
    </>
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
        const job = type === "automation" && "job" in row ? row.job : "";
        return (
          <div
            key={row.id}
            className={`admin-log-item${level === "error" ? " admin-log-item--error" : " admin-log-item--ok"}`}
          >
            <div className="admin-log-row">
              <span style={{ color: level === "error" ? "#ff6b7a" : "var(--text)" }}>{msg}</span>
              <time dateTime={at} style={{ color: "var(--muted)", flexShrink: 0 }}>
                {formatDt(at)}
              </time>
            </div>
            {job && <div style={{ color: "var(--muted)", marginTop: 4 }}>{job}</div>}
          </div>
        );
      })}
    </div>
  );
}
