"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import {
  printQueueService,
  type PrinterStatus,
  type PrintQueueJob,
} from "@/lib/api/print-queue";

const STATUS_LABELS: Record<string, string> = {
  queued: "בתור 🕐",
  approved: "מאושר ✅",
  claimed: "נלקח 📥",
  printing: "בדפוס 🖨️",
  printed: "הודפס 🖨️",
  failed: "נכשל ❌",
  cancelled: "בוטל ⛔",
};

const STATUS_COLORS: Record<string, string> = {
  queued: "#ffb347",
  approved: "#c9a84c",
  claimed: "#8aaabe",
  printing: "#8aaabe",
  printed: "#1db96a",
  failed: "#ff6b7a",
  cancelled: "#888",
};

const PRINTER_LEVEL_STYLES: Record<
  string,
  { bg: string; border: string; color: string; dot: string; title: string }
> = {
  ready: {
    bg: "rgba(29,185,106,.12)",
    border: "#1db96a",
    color: "#1db96a",
    dot: "#1db96a",
    title: "מדפסת מחוברת — ניתן להתחיל הדפסה",
  },
  agent_only: {
    bg: "rgba(255,179,71,.12)",
    border: "#ffb347",
    color: "#ffb347",
    dot: "#ffb347",
    title: "סוכן מחובר — מדפסת לא מוכנה",
  },
  offline: {
    bg: "rgba(255,107,122,.12)",
    border: "#ff6b7a",
    color: "#ff6b7a",
    dot: "#ff6b7a",
    title: "מדפסת לא מחוברת",
  },
  never_seen: {
    bg: "rgba(255,107,122,.12)",
    border: "#ff6b7a",
    color: "#ff6b7a",
    dot: "#ff6b7a",
    title: "סוכן הדפסה לא הוגדר",
  },
};

const FILTERS = [
  { key: "", label: "פעיל" },
  { key: "queued", label: "בתור" },
  { key: "approved", label: "מאושר" },
  { key: "claimed", label: "נלקח" },
  { key: "printing", label: "בדפוס" },
  { key: "failed", label: "נכשל" },
];

export default function AdminPrintQueuePage() {
  return (
    <ProtectedRoute adminOnly>
      <PrintQueuePageInner />
    </ProtectedRoute>
  );
}

function PrintQueuePageInner() {
  const [jobs, setJobs] = useState<PrintQueueJob[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [canStartPrinting, setCanStartPrinting] = useState(false);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await printQueueService.list(filter || undefined);
      setJobs(res.jobs);
      setCounts(res.counts);
      setPrinterStatus(res.printerStatus);
      setCanStartPrinting(res.canStartPrinting);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת תור ההדפסה"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (jobId: number, fn: () => Promise<unknown>, ok: string) => {
    setActionId(jobId);
    setMessage("");
    setError("");
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e) {
      setError(extractApiError(e, "פעולה נכשלה"));
    } finally {
      setActionId(null);
    }
  };

  const approveSelected = async () => {
    const orderIds = jobs
      .filter((j) => selected.has(j.id) && j.status === "queued")
      .map((j) => j.orderId);
    if (!orderIds.length) {
      setError("בחר משימות בסטטוס «בתור»");
      return;
    }
    setActionId(-1);
    try {
      await printQueueService.approveBulk(orderIds);
      setMessage(`אושרו ${orderIds.length} משימות`);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(extractApiError(e, "אישור מרובה נכשל"));
    } finally {
      setActionId(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Nav />
      <main className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.4rem",
            fontWeight: 900,
            color: "var(--cream)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>🖨️ תור הדפסה</span>
          <Link href="/admin" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
            ← דשבורד
          </Link>
          <Link href="/admin/permissions" className="btn btn-gold" style={{ fontSize: ".72rem" }}>
            🔐 הרשאות
          </Link>
        </div>

        <PrinterStatusBanner status={printerStatus} counts={counts} loading={loading} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              type="button"
              className={`btn ${filter === f.key ? "btn-gold" : "btn-outline"}`}
              style={{ fontSize: ".75rem" }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key && counts[f.key] ? ` (${counts[f.key]})` : ""}
              {!f.key && counts.queued ? ` · בתור ${counts.queued}` : ""}
            </button>
          ))}
          <button type="button" className="btn btn-outline" style={{ fontSize: ".75rem" }} onClick={load}>
            🔄 רענון
          </button>
          <button
            type="button"
            className="btn btn-gold"
            style={{ fontSize: ".75rem" }}
            disabled={!selected.size || actionId !== null}
            title={
              canStartPrinting
                ? "המדפסת מחוברת — האישור יישלח מיד להדפסה"
                : "האישור יישמר בתור — ההדפסה תתחיל כשהמדפסת תתחבר"
            }
            onClick={approveSelected}
          >
            {canStartPrinting ? "▶ אשר והדפס" : "אשר לתור"} ({selected.size})
          </button>
        </div>

        {message && (
          <div style={{ color: "#1db96a", marginBottom: 8, fontSize: ".85rem" }}>{message}</div>
        )}
        {error && (
          <div style={{ color: "#ff6b7a", marginBottom: 8, fontSize: ".85rem" }}>{error}</div>
        )}

        {loading && !jobs.length ? (
          <p style={{ color: "var(--muted)" }}>טוען...</p>
        ) : !jobs.length ? (
          <p style={{ color: "var(--muted)" }}>אין משימות בתור — הזמנות חדשות נכנסות אוטומטית אחרי שליחה.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map((j) => (
              <div
                key={j.id}
                className="card"
                style={{
                  padding: 14,
                  borderRight: `4px solid ${STATUS_COLORS[j.status] || "#888"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    {j.status === "queued" && (
                      <input
                        type="checkbox"
                        checked={selected.has(j.id)}
                        onChange={() => toggleSelect(j.id)}
                        aria-label={`בחר ${j.orderNumber}`}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, color: "var(--cream)" }}>
                        {j.orderNumber}{" "}
                        <span style={{ fontSize: ".8rem", color: STATUS_COLORS[j.status] }}>
                          {STATUS_LABELS[j.status] || j.status}
                        </span>
                      </div>
                      <div style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 4 }}>
                        {j.user?.name} · {j.tablesCount} טבלאות · ₪{j.totalIls.toFixed(2)} ·{" "}
                        {new Date(j.createdAt).toLocaleString("he-IL")}
                      </div>
                      {j.lastError && (
                        <div style={{ fontSize: ".75rem", color: "#ff6b7a", marginTop: 4 }}>
                          {j.lastError}
                        </div>
                      )}
                      {j.claimedByAgent && (
                        <div style={{ fontSize: ".75rem", color: "var(--muted)", marginTop: 2 }}>
                          סוכן: {j.claimedByAgent}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {j.status === "queued" && (
                      <button
                        type="button"
                        className="btn btn-gold"
                        style={{ fontSize: ".7rem" }}
                        disabled={actionId === j.id}
                        title={
                          canStartPrinting
                            ? "מדפסת מחוברת — יודפס מיד"
                            : "יישמר כמאושר — יודפס כשהמדפסת תתחבר"
                        }
                        onClick={() =>
                          run(
                            j.id,
                            () => printQueueService.approve(j.id),
                            canStartPrinting ? "נשלח להדפסה" : "אושר לתור — ממתין למדפסת",
                          )
                        }
                      >
                        {canStartPrinting ? "▶ אשר והדפס" : "אשר לתור"}
                      </button>
                    )}
                    {j.status === "failed" && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: ".7rem" }}
                        disabled={actionId === j.id}
                        onClick={() =>
                          run(j.id, () => printQueueService.retry(j.id), "חזר לתור")
                        }
                      >
                        נסה שוב
                      </button>
                    )}
                    {["queued", "approved", "failed"].includes(j.status) && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: ".7rem", color: "#ff6b7a" }}
                        disabled={actionId === j.id}
                        onClick={() =>
                          run(j.id, () => printQueueService.cancel(j.id), "בוטל")
                        }
                      >
                        בטל
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className="card"
          style={{ marginTop: 24, padding: 16, fontSize: ".82rem", color: "var(--muted)", lineHeight: 1.6 }}
        >
          <strong style={{ color: "var(--cream)" }}>איך זה עובד:</strong>
          <ol style={{ margin: "8px 0 0", paddingRight: 20 }}>
            <li>לקוח שולח טופס → נכנס אוטומטית לתור (סטטוס «בתור»).</li>
            <li>צוות מאשר → «מאושר» — הסוכן המקומי מושך ומדפיס.</li>
            <li>אחרי הדפסה → confirm → «הודפס» → scan_app → «הושלם».</li>
          </ol>
        </div>
      </main>
      <style>{`
        @keyframes printer-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}

function PrinterStatusBanner({
  status,
  counts,
  loading,
}: {
  status: PrinterStatus | null;
  counts: Record<string, number>;
  loading: boolean;
}) {
  const level = status?.level ?? "never_seen";
  const style = PRINTER_LEVEL_STYLES[level] ?? PRINTER_LEVEL_STYLES.never_seen;
  const ready = status?.canStartPrinting ?? false;
  const queued = counts.queued ?? 0;
  const approved = counts.approved ?? 0;

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: "18px 20px",
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: 12,
      }}
      role="status"
      aria-live="polite"
      aria-label={status?.message ?? "סטטוס מדפסת"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: style.dot,
            flexShrink: 0,
            animation: ready ? "printer-pulse 1.6s ease-in-out infinite" : "none",
            boxShadow: ready ? `0 0 12px ${style.dot}` : "none",
          }}
          aria-hidden
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: "'Frank Ruhl Libre',serif",
              fontSize: "1.15rem",
              fontWeight: 900,
              color: style.color,
            }}
          >
            {style.title}
          </div>
          <div style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: 4 }}>
            {loading && !status ? "בודק חיבור..." : status?.message}
            {ready && (queued > 0 || approved > 0) && (
              <span>
                {" "}
                · בתור: {queued} · מאושר: {approved}
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: ready ? "rgba(29,185,106,.2)" : "rgba(0,0,0,.06)",
            color: ready ? "#1db96a" : "var(--muted)",
            fontWeight: 800,
            fontSize: ".85rem",
            whiteSpace: "nowrap",
          }}
        >
          {ready ? "✓ מוכן להדפסה" : "✗ לא מוכן"}
        </div>
      </div>

      {status?.agents?.length ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${style.border}33`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {status.agents.map((a) => (
            <div
              key={a.agentId}
              style={{ fontSize: ".78rem", color: "var(--muted)", display: "flex", gap: 8, flexWrap: "wrap" }}
            >
              <span style={{ fontWeight: 700, color: "var(--cream)" }}>{a.agentId}</span>
              {a.hostname && <span>{a.hostname}</span>}
              <span>
                {a.online ? (a.printerReady ? "🟢 מחובר + מדפסת מוכנה" : "🟡 סוכן בלבד") : "🔴 לא מחובר"}
              </span>
              {a.printerMessage && <span>— {a.printerMessage}</span>}
              {a.lastSeenAt && (
                <span>
                  · עודכן{" "}
                  {a.lastSeenSecondsAgo != null && a.lastSeenSecondsAgo < 120
                    ? `לפני ${a.lastSeenSecondsAgo} שנ׳`
                    : new Date(a.lastSeenAt).toLocaleString("he-IL")}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: ".78rem", color: "var(--muted)" }}>
          הפעל <code>python tools/print_agent.py</code> על מחשב המדפסת — האינדיקטור יתעדכן אוטומטית.
        </div>
      )}
    </div>
  );
}
