"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { adminService, type IntegrationLogEntry, type IntegrationStatus } from "@/lib/api/admin";
import { extractApiError } from "@/lib/api/client";
import { formatPrintSuccessMessage } from "@/lib/api/print-feedback";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";
interface Stats { total_users: number; new_today: number; active_subs: number; pending_orders: number; total_revenue: number; total_wins: number; total_prize: number; }
interface Order {
  id: number;
  orderNumber: string;
  tablesCount: number;
  totalIls: number;
  status: string;
  drawDate: string;
  createdAt: string;
  user?: { name: string; phone?: string; email?: string };
  icountDocNumber?: string | null;
  icountPdfLink?: string | null;
  icountDocId?: string | null;
  invoiceIssuedAt?: string | null;
  printedAt?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין 🕐", paid: "שולם ✅", printing: "בדפוס 🖨️", printed: "הודפס 🖨️",
  shipped: "נשלח 📬", sent: "נשלח 📬", completed: "הושלם ✅", delivered: "הוגש ✅", cancelled: "בוטל ❌",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#ffb347", paid: "#ffb347", printing: "#8aaabe", printed: "#8aaabe",
  shipped: "#c9a84c", sent: "#c9a84c", completed: "#1db96a", delivered: "#1db96a", cancelled: "#ff6b7a",
};
const STATUS_ORDER = ["pending", "paid", "printing", "printed", "shipped", "completed", "cancelled"];

function orderHasInvoice(o: Order): boolean {
  return Boolean(o.icountDocNumber?.trim() || o.icountPdfLink?.trim());
}

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly>
      <AdminPageInner />
    </ProtectedRoute>
  );
}

function AdminPageInner() {
  const { isAdmin, isStaff } = useAuth();
  const canManageOrders = isAdmin || isStaff;
  const backendOrigin = useBackendOrigin();
  const djangoAdminUrl = `${backendOrigin}/admin/`;
  const [legacyToken, setLegacyToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"orders"|"wins">("orders");
  const [winDate, setWinDate] = useState(new Date().toISOString().slice(0,10));
  const [winNums, setWinNums] = useState("");
  const [winStrong, setWinStrong] = useState("");
  const [winResult, setWinResult] = useState<{wins:number;total_prize_ils:number}|null>(null);

  const [drawDate, setDrawDate] = useState(new Date().toISOString().slice(0,10));
  const [drawNums2, setDrawNums2] = useState("");
  const [drawStrong2, setDrawStrong2] = useState("");
  const [drawPrizes, setDrawPrizes] = useState({
    "6+strong": 5000000, "6": 500000, "5+strong": 50000, "5": 5000,
    "4+strong": 500, "4": 50, "3+strong": 56, "3": 15
  });
  const [paisLotteryId, setPaisLotteryId] = useState("");
  const [paisLoading, setPaisLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [integrations, setIntegrations] = useState<{
    icount: IntegrationStatus;
    print: IntegrationStatus;
  } | null>(null);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = "ok", ms = 2800) => {
    setToast({ msg, type });
    if (ms > 0) setTimeout(() => setToast(null), ms);
  }, []);

  const legacyAdminHeader = (): Record<string, string> =>
    legacyToken ? { "x-admin-token": legacyToken } : {};

  const fetchFromPais = async () => {
    setPaisLoading(true);
    try {
      if (canManageOrders) {
        const d = await adminService.refreshDraw(paisLotteryId || undefined);
        const ld = d.last_draw;
        setDrawNums2(ld.numbers?.join(", ") || "");
        setDrawStrong2(String(ld.strong || ""));
        setDrawDate(ld.date || drawDate);
        if (d.prizes) {
          const p: Record<string, number> = {};
          Object.entries(d.prizes).forEach(([k, v]) => {
            p[k] = v.ils || 0;
          });
          setDrawPrizes(prev => ({ ...prev, ...p }));
        }
        alert(`✅ נטענו ושמרנו הגרלה ${ld.lottery_id} מפיס`);
        return;
      }
      const url = paisLotteryId ? `/api/pais?id=${paisLotteryId}` : "/api/pais";
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) { alert("❌ " + d.error); return; }
      setDrawNums2(d.numbers?.join(", ") || "");
      setDrawStrong2(String(d.strong || ""));
      setDrawDate(d.date || drawDate);
      if (d.prizes) {
        const p: Record<string, number> = {};
        Object.entries(d.prizes).forEach(([k, v]: [string, unknown]) => {
          p[k] = (v as { ils: number }).ils || 0;
        });
        setDrawPrizes(prev => ({ ...prev, ...p }));
      }
      alert(`✅ נטענו נתוני הגרלה ${d.lottery_id}`);
    } catch (e) {
      alert("❌ " + extractApiError(e, "שגיאה בטעינה מפיס"));
    } finally {
      setPaisLoading(false);
    }
  };

  const saveDraw = async () => {
    const nums = drawNums2.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 37);
    const strong2 = parseInt(drawStrong2);
    if (nums.length !== 6) { alert("נדרשים 6 מספרים"); return; }
    if (!strong2 || strong2 < 1 || strong2 > 7) { alert("חזק צריך להיות 1-7"); return; }
    const prizes2 = Object.fromEntries(
      Object.entries(drawPrizes).map(([k, ils]) => [k, { name: k, ils }])
    );
    const r = await fetch("/api/pais", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...legacyAdminHeader() },
      body: JSON.stringify({ lottery_id: paisLotteryId, date: drawDate, numbers: nums, strong: strong2, prizes: prizes2 }),
    });
    const d = await r.json();
    if (r.ok) alert("✅ תוצאות נשמרו!");
    else alert("❌ " + d.error);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (canManageOrders) {
        const [s, o] = await Promise.all([
          adminService.stats(),
          adminService.orders(filter || undefined),
        ]);
        setStats(s);
        setOrders(o.orders);
        if (o.integrations) setIntegrations(o.integrations);
        if (o.logs) setIntegrationLogs(o.logs);
      } else if (legacyToken) {
        const h = { "x-admin-token": legacyToken };
        const [s, o] = await Promise.all([
          fetch("/api/admin/stats", { headers: h }).then(r => r.ok ? r.json() : null),
          fetch("/api/admin/orders", { headers: h }).then(r => r.ok ? r.json() : null),
        ]);
        setStats(s);
        setOrders(o?.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [canManageOrders, legacyToken, filter]);

  const printOrder = async (orderId: number) => {
    if (!canManageOrders) return;
    setActionLoading(orderId);
    try {
      const res = await adminService.printOrder(orderId);
      showToast(res.detail || formatPrintSuccessMessage(res), "ok");
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: o.status === "paid" ? "paid" : o.status } : o,
        ),
      );
    } catch (e) {
      showToast(extractApiError(e, "הדפסה נכשלה"), "err", 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const issueInvoice = async (orderId: number) => {
    if (!canManageOrders) return;
    setActionLoading(orderId);
    try {
      const res = await adminService.issueInvoice(orderId);
      if (!res.doc_number?.trim()) {
        alert(res.detail || "הנפקת חשבונית נכשלה — אין מספר מסמך מ-iCount");
        const logRes = await adminService.integrationLogs({ source: "icount", limit: 20 });
        setIntegrationLogs(logRes.logs);
        if (logRes.integrations) setIntegrations(logRes.integrations);
        return;
      }
      alert(`חשבונית ${res.doc_number} הונפקה`);
      const issuedAt = res.invoice_issued_at || new Date().toISOString();
      const pdfLink = res.pdf_link?.trim();
      setOrders(prev =>
        prev.map(o => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            icountDocNumber: res.doc_number,
            icountPdfLink: pdfLink || o.icountPdfLink,
            invoiceIssuedAt: issuedAt,
          };
        }),
      );
      const logRes = await adminService.integrationLogs({ limit: 30 });
      setIntegrationLogs(logRes.logs);
      if (pdfLink) {
        setTimeout(() => window.open(pdfLink, "_blank", "noopener,noreferrer"), 300);
      }
    } catch (e) {
      alert(extractApiError(e, "הנפקת חשבונית נכשלה"));
      try {
        const logRes = await adminService.integrationLogs({ source: "icount", limit: 20 });
        setIntegrationLogs(logRes.logs);
      } catch { /* ignore */ }
    } finally {
      setActionLoading(null);
    }
  };

  const viewInvoice = async (order: Order) => {
    if (!canManageOrders) return;
    if (!orderHasInvoice(order)) {
      alert("טרם הונפקה חשבונית — לחץ «הנפק חשבונית» קודם.");
      return;
    }
    const link = order.icountPdfLink?.trim();
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    setActionLoading(order.id);
    try {
      const res = await adminService.getInvoice(order.id);
      if (res.pdf_link) {
        setOrders(prev =>
          prev.map(o =>
            o.id === order.id
              ? {
                  ...o,
                  icountPdfLink: res.pdf_link || o.icountPdfLink,
                  icountDocNumber: res.doc_number || o.icountDocNumber,
                }
              : o,
          ),
        );
        window.open(res.pdf_link, "_blank", "noopener,noreferrer");
        return;
      }
      alert(
        res.doc_number
          ? `חשבונית ${res.doc_number} ב-iCount — אין קישור PDF. פתח את המסמך באתר iCount.`
          : "לא נמצא קישור לחשבונית — נסה «הנפק חשבונית» מחדש.",
      );
    } catch (e) {
      const msg = extractApiError(e, "לא ניתן לטעון את החשבונית");
      alert(msg);
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                icountDocNumber: null,
                icountPdfLink: null,
                icountDocId: null,
                invoiceIssuedAt: null,
              }
            : o,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    if (canManageOrders) {
      await adminService.updateOrderStatus(orderId, status);
    } else if (legacyToken) {
      await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": legacyToken },
        body: JSON.stringify({ order_id: orderId, status }),
      });
    } else return;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const checkWins = async (dryRun = false) => {
    if (canManageOrders) {
      try {
        const d = await adminService.checkWins({ dry_run: dryRun });
        setWinResult({
          wins: d.wins,
          total_prize_ils: d.total_prize_ils,
        });
        if (!dryRun && d.credited > 0) {
          showToast(`זוכו ${d.credited} טבלאות — סה״כ ₪${d.total_prize_ils.toLocaleString()}`, "ok", 5000);
        }
      } catch (e) {
        alert("❌ " + extractApiError(e, "בדיקת זכיות נכשלה"));
      }
      return;
    }
    if (!legacyToken) {
      alert("בדיקת זכיות דורשת Legacy Admin Token (הגדר ב-sessionStorage: admin_token)");
      return;
    }
    const nums = winNums.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 37);
    const strong = parseInt(winStrong);
    if (nums.length !== 6 || isNaN(strong) || strong < 1 || strong > 7) { alert("מספרים לא תקינים"); return; }
    const r = await fetch("/api/admin/check-wins", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...legacyAdminHeader() },
      body: JSON.stringify({ draw_date: winDate, numbers: nums, strong }),
    });
    const d = await r.json();
    setWinResult(d);
  };

  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) setLegacyToken(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <>
      <Nav />
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`toast toast-${toast.type === "err" ? "err" : "ok"}`}
        >
          {toast.msg}
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px 60px" }}>
        <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.4rem", fontWeight: 900, color: "var(--cream)", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>🎯 דשבורד אדמין</span>
          <Link href="/admin/print-queue" className="btn btn-gold" style={{ fontSize: ".72rem" }}>
            🖨️ תור הדפסה
          </Link>
          <Link href="/admin/permissions" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
            🔐 מתן הרשאות
          </Link>
          <Link href="/admin/services" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
            ⚙️ שירותים
          </Link>
          <a href={djangoAdminUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
            Django Admin ↗
          </a>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "משתמשים", value: stats.total_users, sub: `+${stats.new_today} היום` },
              { label: "מנויים פעילים", value: stats.active_subs },
              { label: "ממתינות להגשה", value: stats.pending_orders, color: "#ffb347" },
              { label: "הכנסות", value: `₪${stats.total_revenue?.toFixed(0)}` },
              { label: "זכיות", value: stats.total_wins },
              { label: "פרסים", value: `₪${stats.total_prize?.toFixed(0)}` },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 10, padding: "14px 12px" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color || "var(--gold)" }}>{s.value}</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 3 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: ".62rem", color: "var(--green)", marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {canManageOrders && integrations && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, fontSize: ".72rem" }}>
            <span style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--navy-b)", background: integrations.icount.configured ? "rgba(29,185,106,.12)" : "rgba(255,107,122,.12)", color: integrations.icount.configured ? "var(--green)" : "#ff6b7a" }}>
              iCount: {integrations.icount.configured ? "מחובר" : "לא מוגדר"}
              {integrations.icount.doctype ? ` · סוג ${integrations.icount.doctype}` : ""}
            </span>
            <span style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--navy-b)", background: integrations.print.configured ? "rgba(29,185,106,.12)" : "rgba(255,179,71,.12)", color: integrations.print.configured ? "var(--green)" : "#ffb347" }}>
              הדפסה: {integrations.print.configured ? "מחובר" : "לא מוגדר"}
            </span>
            {!integrations.icount.configured && integrations.icount.hint && (
              <span style={{ color: "var(--muted)" }}>{integrations.icount.hint}</span>
            )}
          </div>
        )}

        {canManageOrders && (
          <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, marginBottom: 16, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setLogsExpanded(v => !v)}
              style={{ width: "100%", padding: "11px 16px", border: "none", borderBottom: logsExpanded ? "1px solid var(--navy-b)" : "none", background: "transparent", color: "var(--cream)", fontFamily: "Heebo,sans-serif", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>📋 לוג אינטגרציות (iCount / הדפסה)</span>
              <span style={{ color: "var(--muted)", fontSize: ".7rem" }}>{logsExpanded ? "הסתר" : "הצג"} · {integrationLogs.length}</span>
            </button>
            {logsExpanded && (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {integrationLogs.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: ".75rem" }}>אין רשומות עדיין — הנפק חשבונית או הדפסה כדי לראות לוגים</div>
                )}
                {integrationLogs.map(log => (
                  <div key={log.id} style={{ padding: "8px 16px", borderBottom: "1px solid var(--navy-b)", fontSize: ".7rem", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                    <span style={{ color: log.level === "error" ? "#ff6b7a" : log.level === "warning" ? "#ffb347" : "var(--green)", fontWeight: 700, minWidth: 52 }}>
                      {log.source === "icount" ? "iCount" : log.source === "print" ? "הדפסה" : log.source}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: ".62rem" }}>
                      {new Date(log.createdAt).toLocaleString("he-IL")}
                    </span>
                    {log.orderNumber && <span style={{ color: "var(--gold)" }}>{log.orderNumber}</span>}
                    <span style={{ color: "var(--cream)", flex: "1 1 200px" }}>{log.message}</span>
                    {Object.keys(log.details || {}).length > 0 && (
                      <details style={{ width: "100%", color: "var(--muted)", fontSize: ".62rem" }}>
                        <summary style={{ cursor: "pointer" }}>פרטים</summary>
                        <pre style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["orders","wins"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${tab===t?"var(--gold)":"var(--navy-b)"}`, background: tab===t?"rgba(201,168,76,.1)":"transparent", color: tab===t?"var(--gold)":"var(--muted)", fontFamily: "Heebo,sans-serif", fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>
              {t === "orders" ? "📋 הזמנות" : "🏆 בדיקת זכיות"}
            </button>
          ))}
          <button onClick={() => loadData()} className="btn btn-outline" style={{ marginRight: "auto", fontSize: ".72rem" }}>🔄</button>
        </div>

        {tab === "orders" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {["", ...STATUS_ORDER].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid var(--navy-b)", background: filter===s?"var(--gold)":"transparent", color: filter===s?"var(--navy)":"var(--muted)", fontFamily: "Heebo,sans-serif", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>
                  {s ? STATUS_LABELS[s] : "הכל"}
                </button>
              ))}
            </div>

            <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--navy-b)", fontWeight: 700, fontSize: ".82rem", color: "var(--cream)" }}>
                הזמנות ({filteredOrders.length})
              </div>
              {loading && <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>טוען...</div>}
              {filteredOrders.map(o => (
                <div key={o.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "11px 16px", borderBottom: "1px solid var(--navy-b)", fontSize: ".76rem" }}>
                  <div style={{ flex: "1 0 200px" }}>
                    <div style={{ fontWeight: 700, color: "var(--gold)" }}>{o.orderNumber}</div>
                    <div style={{ color: "var(--muted)", fontSize: ".68rem" }}>{o.user?.name} · {o.user?.phone || o.user?.email}</div>
                  </div>
                  <div style={{ color: "var(--muted)" }}>{o.tablesCount} טבלאות</div>
                  <div style={{ color: "var(--cream)" }}>₪{o.totalIls?.toFixed(2)}</div>
                  <div style={{ color: "var(--muted)" }}>{o.drawDate}</div>
                  <div style={{ color: STATUS_COLORS[o.status] || "var(--muted)", fontWeight: 700, minWidth: 80 }}>{STATUS_LABELS[o.status] || o.status}</div>
                  <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                    style={{ background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 7, color: "var(--cream)", fontFamily: "Heebo,sans-serif", fontSize: ".72rem", padding: "4px 8px", cursor: "pointer" }}>
                    {STATUS_ORDER.map(v => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
                  </select>
                  {canManageOrders && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: ".68rem", padding: "4px 10px" }}
                        disabled={actionLoading === o.id}
                        onClick={() => printOrder(o.id)}
                      >
                        {actionLoading === o.id ? "..." : "🖨️ הדפס"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                          fontSize: ".68rem",
                          padding: "4px 10px",
                          opacity: orderHasInvoice(o) ? 0.45 : 1,
                        }}
                        disabled={actionLoading === o.id || orderHasInvoice(o)}
                        onClick={() => issueInvoice(o.id)}
                        title={orderHasInvoice(o) ? "חשבונית כבר הונפקה" : undefined}
                      >
                        {actionLoading === o.id ? "..." : "📄 הנפק חשבונית"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-gold"
                        style={{
                          fontSize: ".68rem",
                          padding: "4px 10px",
                          opacity: orderHasInvoice(o) ? 1 : 0.45,
                        }}
                        disabled={actionLoading === o.id || !orderHasInvoice(o)}
                        onClick={() => viewInvoice(o)}
                        title={
                          orderHasInvoice(o) && o.invoiceIssuedAt
                            ? `הונפקה ${new Date(o.invoiceIssuedAt).toLocaleDateString("he-IL")}${
                                o.icountDocNumber ? ` · ${o.icountDocNumber}` : ""
                              }`
                            : "הנפק חשבונית לפני הצגה"
                        }
                      >
                        📄 הצג חשבונית
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!loading && filteredOrders.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: ".78rem" }}>אין הזמנות</div>}
            </div>
          </>
        )}

        {tab === "wins" && (
          <div style={{ background: "rgba(26,45,66,.85)", border: "1px solid var(--navy-b)", borderRadius: 14, padding: "20px 18px" }}>
            <h3 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.05rem", fontWeight: 700, color: "var(--cream)", marginBottom: 16 }}>תוצאות הגרלה וזכיות</h3>
            {canManageOrders && (
              <p style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 12 }}>
                צוות: טען מפיס → בדוק זכיות (מזכה יתרות בארנק הלקוחות אוטומטית).
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>תאריך הגרלה:</div>
                <input type="date" value={winDate} onChange={e => setWinDate(e.target.value)}
                  style={{ background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", fontSize: ".88rem" }} />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>6 מספרים (מופרדים בפסיקים):</div>
                <input value={winNums} onChange={e => setWinNums(e.target.value)} placeholder="3, 7, 12, 25, 33, 36"
                  style={{ width: "100%", background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", fontSize: ".88rem", textAlign: "right" }} />
              </div>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 5 }}>מספר חזק (1–7):</div>
                <input value={winStrong} onChange={e => setWinStrong(e.target.value)} placeholder="5" maxLength={1}
                  style={{ width: 80, background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", fontSize: ".88rem", textAlign: "center" }} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {canManageOrders ? (
                  <>
                    <button className="btn btn-outline" style={{ padding: "10px 20px" }} onClick={() => checkWins(true)}>
                      🔎 תצוגה מקדימה (ללא זיכוי)
                    </button>
                    <button className="btn btn-gold" style={{ padding: "10px 20px" }} onClick={() => checkWins(false)}>
                      💰 בדוק זכיות וזכה ארנקים
                    </button>
                  </>
                ) : (
                  <button className="btn btn-gold" style={{ padding: "10px 20px" }} onClick={() => checkWins(false)}>
                    🔍 בדוק זכיות לקוחות
                  </button>
                )}
              </div>
              <hr style={{ border: "none", borderTop: "1px solid var(--navy-b)", margin: "16px 0" }} />
              <h4 style={{ color: "var(--cream)", fontSize: ".88rem", marginBottom: 12 }}>💾 עדכן תוצאות הגרלה</h4>
              <p style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 12 }}>הזן ידנית מאתר <a href="https://www.pais.co.il/lotto/" target="_blank" style={{ color: "var(--gold)" }}>pais.co.il</a></p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>תאריך הגרלה:</div>
                  <input type="date" value={drawDate} onChange={e => setDrawDate(e.target.value)}
                    style={{ background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif" }} />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>6 מספרים (מופרדים בפסיקים):</div>
                  <input value={drawNums2} onChange={e => setDrawNums2(e.target.value)} placeholder="10, 23, 25, 28, 32, 33"
                    style={{ width: "100%", background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", textAlign: "right" }} />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 4 }}>מספר חזק (1-7):</div>
                  <input value={drawStrong2} onChange={e => setDrawStrong2(e.target.value)} placeholder="4" maxLength={1}
                    style={{ width: 80, background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", textAlign: "center" }} />
                </div>
                <div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 6 }}>פרסים (₪):</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                    {Object.entries(drawPrizes).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: ".6rem", color: "var(--muted)", marginBottom: 2 }}>{k}</div>
                        <input type="number" value={v} onChange={e => setDrawPrizes(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))}
                          style={{ width: "100%", background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 6, color: "var(--cream)", padding: "5px 6px", fontFamily: "Heebo,sans-serif", fontSize: ".76rem", textAlign: "center" }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input value={paisLotteryId} onChange={e => setPaisLotteryId(e.target.value)}
                    placeholder="מס' הגרלה (ריק = אחרונה)"
                    style={{ width: 180, background: "var(--navy)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", padding: "8px 12px", fontFamily: "Heebo,sans-serif", fontSize: ".78rem" }} />
                  <button className="btn btn-outline" onClick={fetchFromPais} disabled={paisLoading}>
                    {paisLoading ? "...טוען" : "🔄 טען מפאיס.co.il"}
                  </button>
                  <button className="btn btn-gold" style={{ padding: "10px 20px" }} onClick={saveDraw}>💾 שמור תוצאות</button>
                </div>
              </div>

              {winResult && (
                <div style={{ background: winResult.wins > 0 ? "rgba(29,185,106,.1)" : "rgba(26,45,66,.5)", border: `1px solid ${winResult.wins > 0 ? "rgba(29,185,106,.35)" : "var(--navy-b)"}`, borderRadius: 10, padding: "14px 16px", marginTop: 8 }}>
                  {winResult.wins > 0 ? (
                    <>
                      <div style={{ fontWeight: 700, color: "var(--green)", fontSize: ".92rem", marginBottom: 4 }}>🎉 נמצאו {winResult.wins} זכיות!</div>
                      <div style={{ color: "var(--muted)", fontSize: ".76rem" }}>סה"כ פרסים: ₪{winResult.total_prize_ils.toLocaleString()}</div>
                      {canManageOrders && (
                        <div style={{ color: "var(--muted)", fontSize: ".72rem", marginTop: 4 }}>יתרות הארנק עודכנו בשרת</div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>אין זכיות בהגרלה זו</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
