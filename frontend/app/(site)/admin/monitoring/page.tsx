"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
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
      <div className="page-wrap" style={{ maxWidth: 1100 }}>
        <AdminNavTabs active="monitoring" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "0 0 6px", color: "var(--cream)" }}>
              📊 ניטור תשתית
            </h1>
            <p style={{ color: "var(--text2)", fontSize: ".82rem", margin: 0, lineHeight: 1.5 }}>
              אוטומציה, תנועה באתר, מאגר צירופים, גדלי קבצים וסטטוס שירותים
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
              🔄 רענן
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={runSync} disabled={syncing}>
              {syncing ? "מריץ…" : "▶ סנכרון יומי עכשיו"}
            </button>
          </div>
        </div>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}
        {message && <div className="result-pass" style={{ marginBottom: 12 }}>{message}</div>}

        {loading && !snap ? (
          <p style={{ color: "var(--muted)" }}>טוען…</p>
        ) : snap ? (
          <>
            <div className="perm-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
              <StatCard label="משתמשים" value={String(snap.users.total)} sub={`+${snap.users.newToday} היום`} />
              <StatCard label="כניסות היום" value={String(snap.traffic.pageViewsToday)} sub={`${snap.traffic.uniqueVisitorsToday} ייחודיים`} />
              <StatCard label="הזמנות היום" value={String(snap.traffic.ordersToday)} sub={`${snap.business.totalOrders} סה״כ`} />
              <StatCard label="צ׳אט היום" value={String(snap.traffic.chatSessionsToday)} sub={`${snap.chatInquiriesOpen} ביקשו נציג`} />
              <StatCard label="צירופים פנויים" value={String(snap.comboPool.free)} sub={`${snap.comboPool.percentUsed}% בשימוש`} />
              <StatCard label="הגרלה אחרונה" value={snap.draw.lotteryId ? String(snap.draw.lotteryId) : "—"} sub={snap.draw.date || ""} />
            </div>

            <div className="perm-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <Panel title="שירותים ועלויות">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {snap.services.map((s) => (
                    <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: ".78rem" }}>
                      <span style={{ color: "var(--text)" }}>{s.label}</span>
                      <span style={{ color: s.configured ? "var(--green)" : "var(--muted)", textAlign: "left" }}>
                        {s.configured ? "מחובר" : (s.hint || "לא מוגדר")}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="גדלי קבצים">
                {snap.files.map((f) => (
                  <div key={f.name} style={{ fontSize: ".76rem", marginBottom: 8, color: "var(--text2)" }}>
                    <strong style={{ color: "var(--cream)" }}>{f.name}</strong>
                    {f.exists ? ` — ${f.sizeMb} MB` : " — לא נמצא"}
                  </div>
                ))}
              </Panel>
            </div>

            <Panel title="לוג אוטומציה (סנכרון יומי)">
              <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "0 0 10px" }}>
                אחרון: {formatDt(snap.automation.lastRunAt)} · {snap.automation.lastMessage || "—"}
              </p>
              <LogTable rows={snap.automation.logs} type="automation" />
            </Panel>

            <Panel title="לוג אינטגרציות (iCount / הדפסה)" style={{ marginTop: 14 }}>
              <LogTable rows={snap.integrations} type="integration" />
            </Panel>

            <Panel title="תנועה — 7 ימים" style={{ marginTop: 14 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: ".72rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "var(--muted)", textAlign: "right" }}>
                      <th style={{ padding: 6 }}>תאריך</th>
                      <th style={{ padding: 6 }}>כניסות</th>
                      <th style={{ padding: 6 }}>ייחודיים</th>
                      <th style={{ padding: 6 }}>הזמנות</th>
                      <th style={{ padding: 6 }}>צ׳אט</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.traffic.daily.map((d) => (
                      <tr key={d.date} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: 6 }}>{d.date}</td>
                        <td style={{ padding: 6 }}>{d.pageViews}</td>
                        <td style={{ padding: 6 }}>{d.uniqueVisitors}</td>
                        <td style={{ padding: 6 }}>{d.orders}</td>
                        <td style={{ padding: 6 }}>{d.chatSessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--gold)" }}>{value}</div>
      <div style={{ fontSize: ".65rem", color: "var(--text2)" }}>{sub}</div>
    </div>
  );
}

function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding: 14, ...style }}>
      <div className="lotto-panel-title" style={{ marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function LogTable({
  rows,
  type,
}: {
  rows: AutomationLogRow[] | MonitoringSnapshot["integrations"];
  type: "automation" | "integration";
}) {
  if (!rows.length) {
    return <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>אין רשומות</p>;
  }
  return (
    <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((row) => {
        const level = "level" in row ? row.level : "info";
        const msg = "message" in row ? row.message : "";
        const at = "createdAt" in row ? row.createdAt : "";
        const job = type === "automation" && "job" in row ? row.job : "";
        return (
          <div
            key={row.id}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: level === "error" ? "rgba(255,107,122,.1)" : "var(--bg3)",
              border: "1px solid var(--border)",
              fontSize: ".7rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: level === "error" ? "#ff6b7a" : "var(--text)" }}>{msg}</span>
              <time style={{ color: "var(--muted)", flexShrink: 0 }}>{formatDt(at)}</time>
            </div>
            {job && <div style={{ color: "var(--muted)", marginTop: 4 }}>{job}</div>}
          </div>
        );
      })}
    </div>
  );
}
