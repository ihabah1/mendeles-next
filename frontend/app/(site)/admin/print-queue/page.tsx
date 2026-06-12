"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import DocFilterChips, { type TriFilter } from "@/components/admin/DocFilterChips";
import OrderFormPreviewModal from "@/components/admin/OrderFormPreviewModal";
import PrintJobTimeline from "@/components/admin/PrintJobTimeline";
import { adminService } from "@/lib/api/admin";
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
  { key: "awaiting_scan", label: "ממתין לסריקה" },
  { key: "scanned", label: "נסרק 📄" },
];

export type PrintQueuePageVariant = "queue" | "scan";

export type PrintQueuePageProps = {
  variant?: PrintQueuePageVariant;
  initialFilter?: string;
};

export function PrintQueuePageInner({
  variant = "queue",
  initialFilter = "",
}: PrintQueuePageProps) {
  const searchParams = useSearchParams();
  const urlStatus = (searchParams.get("status") || "").trim();
  const defaultFilter =
    variant === "scan"
      ? "awaiting_scan"
      : urlStatus || initialFilter;

  const isScanScreen = variant === "scan";
  const [jobs, setJobs] = useState<PrintQueueJob[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [canStartPrinting, setCanStartPrinting] = useState(false);
  const [filter, setFilter] = useState(defaultFilter);
  const [hasScanFilter, setHasScanFilter] = useState<TriFilter>(null);
  const [hasInvoiceFilter, setHasInvoiceFilter] = useState<TriFilter>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (variant === "queue" && urlStatus) {
      setFilter(urlStatus);
    }
  }, [urlStatus, variant]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await printQueueService.list({
        status: filter || undefined,
        q: searchDebounced || undefined,
        has_scan: hasScanFilter ?? undefined,
        has_invoice: hasInvoiceFilter ?? undefined,
      });
      setJobs(res.jobs);
      setCounts(res.counts);
      setPrinterStatus(res.printerStatus);
      setCanStartPrinting(res.canStartPrinting);
      setExpandedId((prev) => (prev && res.jobs.some((j) => j.id === prev) ? prev : null));
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת תור ההדפסה"));
    } finally {
      setLoading(false);
    }
  }, [filter, searchDebounced, hasScanFilter, hasInvoiceFilter]);

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
      const result = await fn();
      const detail =
        result && typeof result === "object" && "detail" in result
          ? String((result as { detail: string }).detail)
          : ok;
      setMessage(detail || ok);
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
        <AdminNavTabs active={isScanScreen ? "scan" : "print-queue"} />
        <div
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.35rem",
            fontWeight: 900,
            color: "var(--cream)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ margin: 0, font: "inherit" }}>
            {isScanScreen ? "📷 מסך סריקה" : "🖨️ תור הדפסה"}
          </h1>
          {isScanScreen && counts.awaiting_scan ? (
            <span
              style={{
                fontSize: ".78rem",
                fontWeight: 700,
                color: "#1db96a",
                background: "rgba(29,185,106,.15)",
                border: "1px solid #1db96a",
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {counts.awaiting_scan} ממתינות לסריקה
            </span>
          ) : null}
        </div>

        {isScanScreen && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              fontSize: ".8rem",
              lineHeight: 1.55,
              borderColor: "#1db96a",
              background: "rgba(29,185,106,.08)",
            }}
          >
            <strong style={{ color: "var(--cream)" }}>סריקה מקומית (scan_app)</strong>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              הרץ על מחשב הסריקה:{" "}
              <code style={{ color: "var(--gold)" }}>python tools/scan_app.py</code>
              {" "}— הזמנות שסומנו כ<strong>הודפס</strong> יופיעו שם. אחרי העלאת PDF הסטטוס הופך ל
              <strong> הושלם</strong> והלקוח רואה את הסריקה בפרופיל.
            </p>
          </div>
        )}

        {!isScanScreen && (
          <PrinterStatusBanner status={printerStatus} counts={counts} loading={loading} />
        )}

        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 חיפוש — מספר הזמנה, שם לקוח, משתמש או טלפון"
            style={{ width: "100%", maxWidth: 480, fontSize: ".82rem" }}
          />
          {searchDebounced && (
            <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 6 }}>
              תוצאות עבור: «{searchDebounced}»
            </div>
          )}
        </div>

        <DocFilterChips
          hasScan={hasScanFilter}
          hasInvoice={hasInvoiceFilter}
          onScanChange={setHasScanFilter}
          onInvoiceChange={setHasInvoiceFilter}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(isScanScreen
            ? FILTERS.filter((f) => ["", "awaiting_scan", "scanned", "printed"].includes(f.key))
            : FILTERS
          ).map((f) => (
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
            className={`btn ${filter === "scanned" ? "btn-gold" : "btn-outline"}`}
            style={{ fontSize: ".75rem" }}
            onClick={() => setFilter((f) => (f === "scanned" ? "" : "scanned"))}
          >
            📄 הצג סריקות
            {counts.scanned ? ` (${counts.scanned})` : ""}
          </button>
          {!isScanScreen && (
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
          )}
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
          <p style={{ color: "var(--muted)" }}>
            {isScanScreen
              ? "אין הזמנות ממתינות לסריקה — סמן «הודפס» או «דלג לסריקה» בתור ההדפסה, ואז רענן scan_app."
              : "אין משימות בתור — הזמנות חדשות נכנסות אוטומטית אחרי שליחה."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map((j) => (
              <PrintJobCard
                key={j.id}
                job={j}
                expanded={expandedId === j.id}
                onToggle={() => setExpandedId((id) => (id === j.id ? null : j.id))}
                selected={selected.has(j.id)}
                onSelectToggle={() => toggleSelect(j.id)}
                canStartPrinting={canStartPrinting}
                actionId={actionId}
                onRun={run}
              />
            ))}
          </div>
        )}

        {!isScanScreen && (
          <div
            className="card"
            style={{ marginTop: 24, padding: 16, fontSize: ".82rem", color: "var(--muted)", lineHeight: 1.6 }}
          >
            <strong style={{ color: "var(--cream)" }}>איך זה עובד:</strong>
            <ol style={{ margin: "8px 0 0", paddingRight: 20 }}>
              <li>לקוח שולח טופס → נכנס אוטומטית לתור (סטטוס «בתור»).</li>
              <li>צוות מאשר → «מאושר» — הסוכן המקומי מושך ומדפיס.</li>
              <li>אחרי הדפסה → confirm → «הודפס» → scan_app → «הושלם».</li>
              <li>«דלג לסריקה» — מדלג על הדפסה פיזית, מסמן כהודפס ומעביר ל-scan_app.</li>
            </ol>
          </div>
        )}
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

export default function AdminPrintQueuePage() {
  return (
    <ProtectedRoute adminOnly>
      <Suspense fallback={<p style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען תור הדפסה...</p>}>
        <PrintQueuePageInner variant="queue" />
      </Suspense>
    </ProtectedRoute>
  );
}

function PrintJobCard({
  job: j,
  expanded,
  onToggle,
  selected,
  onSelectToggle,
  canStartPrinting,
  actionId,
  onRun,
}: {
  job: PrintQueueJob;
  expanded: boolean;
  onToggle: () => void;
  selected: boolean;
  onSelectToggle: () => void;
  canStartPrinting: boolean;
  actionId: number | null;
  onRun: (jobId: number, fn: () => Promise<unknown>, ok: string) => Promise<void>;
}) {
  const [formModalOpen, setFormModalOpen] = useState(false);

  const viewScan = () => {
    if (!j.hasScan) return;
    void onRun(j.id, () => adminService.openOrderScan(j.orderId), "נפתחה סריקה");
  };

  const handleSkipStep = (step: "approve" | "claim" | "print" | "scan") => {
    void onRun(
      j.id,
      async () => {
        const res = await printQueueService.skipStep(j.id, step);
        return res;
      },
      "עודכן",
    );
  };

  return (
    <div
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
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 220 }}>
          {j.status === "queued" && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelectToggle}
              aria-label={`בחר ${j.orderNumber}`}
            />
          )}
          <button
            type="button"
            onClick={onToggle}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textAlign: "right",
              flex: 1,
            }}
          >
            <div style={{ fontWeight: 800, color: "var(--cream)", fontSize: "1rem" }}>
              👤 {j.user?.name || "לקוח"}
            </div>
            <div style={{ fontWeight: 700, color: "var(--gold)", marginTop: 2 }}>
              {j.orderNumber}{" "}
              <span style={{ fontSize: ".78rem", color: STATUS_COLORS[j.status] }}>
                {STATUS_LABELS[j.status] || j.status}
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 4 }}>
              {j.formsCount} טופס{j.formsCount !== 1 ? "ים" : ""} · {j.tablesCount} טבלאות · הגרלה{" "}
              {j.drawDate || "—"}
              {j.isDouble ? " · דאבל" : ""} · ₪{j.totalIls.toFixed(2)}
            </div>
            {j.user?.phone && (
              <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>📱 {j.user.phone}</div>
            )}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: ".68rem" }}
            title="הצג סימולציית טופס"
            aria-label="הצג סימולציית טופס"
            onClick={() => setFormModalOpen(true)}
          >
            👁 הצג
          </button>
          <button type="button" className="btn btn-outline" style={{ fontSize: ".68rem" }} onClick={onToggle}>
            {expanded ? "הסתר פרטים ▲" : "פרטים ▼"}
          </button>
          {j.status === "queued" && (
            <button
              type="button"
              className="btn btn-gold"
              style={{ fontSize: ".68rem" }}
              disabled={actionId === j.id}
              onClick={() =>
                onRun(
                  j.id,
                  () => printQueueService.approve(j.id),
                  canStartPrinting ? "נשלח להדפסה" : "אושר לתור — ממתין למדפסת",
                )
              }
            >
              {canStartPrinting ? "▶ אשר והדפס" : "אשר לתור"}
            </button>
          )}
          {j.hasScan && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: ".68rem", borderColor: "#8aaabe", color: "#8aaabe" }}
              disabled={actionId === j.id}
              title={
                j.orderScannedAt
                  ? `נסרק ${new Date(j.orderScannedAt).toLocaleString("he-IL")}`
                  : "הצג טופס סרוק"
              }
              onClick={viewScan}
            >
              📄 הראה סריקה
            </button>
          )}
          {j.status === "failed" && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: ".68rem" }}
              disabled={actionId === j.id}
              onClick={() => onRun(j.id, () => printQueueService.retry(j.id), "חזר לתור")}
            >
              נסה שוב
            </button>
          )}
          {["queued", "approved", "failed"].includes(j.status) && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: ".68rem", color: "#ff6b7a" }}
              disabled={actionId === j.id}
              onClick={() => onRun(j.id, () => printQueueService.cancel(j.id), "בוטל")}
            >
              בטל
            </button>
          )}
        </div>
      </div>

      <PrintJobTimeline
        orderCreatedAt={j.orderCreatedAt}
        createdAt={j.createdAt}
        approvedAt={j.approvedAt}
        claimedAt={j.claimedAt}
        completedAt={j.completedAt}
        orderPrintedAt={j.orderPrintedAt}
        orderScannedAt={j.orderScannedAt}
        hasScan={j.hasScan}
        jobStatus={j.status}
        orderStatus={j.orderStatus}
        onSkipStep={j.status !== "cancelled" ? handleSkipStep : undefined}
        skipDisabled={actionId === j.id}
      />

      {j.lastError && (
        <div style={{ fontSize: ".75rem", color: "#ff6b7a", marginTop: 4 }}>{j.lastError}</div>
      )}
      {j.claimedByAgent && (
        <div style={{ fontSize: ".72rem", color: "var(--muted)" }}>סוכן: {j.claimedByAgent}</div>
      )}

      {expanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--navy-b)",
            fontSize: ".75rem",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--cream)", marginBottom: 8 }}>פרטי הזמנה</div>
          <div>אימייל: {j.user?.email || "—"}</div>
          <div>סטטוס הזמנה: {j.orderStatus}</div>
          {j.lotteryId != null && <div>מספר הגרלה: {j.lotteryId}</div>}
          {j.hasScan && j.orderScannedAt && (
            <p style={{ marginTop: 10, color: "#1db96a" }}>
              נסרק {new Date(j.orderScannedAt).toLocaleString("he-IL")}
            </p>
          )}
          {j.status === "printed" && !j.hasScan && (
            <p style={{ marginTop: 10, color: "#8aaabe" }}>
              ממתין לסריקה — הרץ scan_app ובחר הזמנה זו.
            </p>
          )}
        </div>
      )}

      <OrderFormPreviewModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        orderNumber={j.orderNumber}
        customerName={j.user?.name}
        drawDate={j.drawDate}
        isDouble={j.isDouble}
        forms={j.forms}
      />
    </div>
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
