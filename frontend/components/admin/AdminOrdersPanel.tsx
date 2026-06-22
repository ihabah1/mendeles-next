"use client";

import { useCallback, useEffect, useState } from "react";
import AdminOrderFlowGuide from "@/components/admin/AdminOrderFlowGuide";
import DocFilterChips, { type TriFilter } from "@/components/admin/DocFilterChips";
import OrderFormPreviewModal from "@/components/admin/OrderFormPreviewModal";
import type { PreviewForm } from "@/components/admin/LottoFormPreview";
import { useAuth } from "@/lib/auth/AuthContext";
import { adminService, type IntegrationLogEntry, type IntegrationStatus } from "@/lib/api/admin";
import { extractApiError } from "@/lib/api/client";
import { formatPrintSuccessMessage } from "@/lib/api/print-feedback";

export interface AdminOrder {
  id: number;
  orderNumber: string;
  tablesCount: number;
  totalIls: number;
  status: string;
  drawDate: string;
  createdAt: string;
  user?: { name: string; phone?: string; email?: string; username?: string | null };
  icountDocNumber?: string | null;
  icountPdfLink?: string | null;
  icountDocId?: string | null;
  invoiceIssuedAt?: string | null;
  printedAt?: string | null;
  scannedAt?: string | null;
  hasScan?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין 🕐",
  paid: "שולם ✅",
  printing: "בדפוס 🖨️",
  printed: "הודפס 🖨️",
  shipped: "נשלח 📬",
  sent: "נשלח 📬",
  completed: "הושלם ✅",
  delivered: "הוגש ✅",
  cancelled: "בוטל ❌",
  scanned: "נסרק 📄",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#ffb347",
  paid: "#ffb347",
  printing: "#8aaabe",
  printed: "#8aaabe",
  shipped: "#c9a84c",
  sent: "#c9a84c",
  completed: "#1db96a",
  delivered: "#1db96a",
  cancelled: "#ff6b7a",
  scanned: "#1db96a",
};
const STATUS_ORDER = ["pending", "paid", "printing", "printed", "shipped", "completed", "cancelled"];
const STATUS_FILTERS = ["", "scanned", ...STATUS_ORDER];

function orderStatusLabel(o: AdminOrder): string {
  if (o.hasScan) return STATUS_LABELS.scanned;
  return STATUS_LABELS[o.status] || o.status;
}

function orderStatusColor(o: AdminOrder): string {
  if (o.hasScan) return STATUS_COLORS.scanned;
  return STATUS_COLORS[o.status] || "var(--muted)";
}

function orderHasInvoice(o: AdminOrder): boolean {
  return Boolean(o.icountDocNumber?.trim() || o.icountPdfLink?.trim());
}

export default function AdminOrdersPanel() {
  const { isAdmin, isStaff } = useAuth();
  const canManageOrders = isAdmin || isStaff;
  const [legacyToken, setLegacyToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [hasScanFilter, setHasScanFilter] = useState<TriFilter>(null);
  const [hasInvoiceFilter, setHasInvoiceFilter] = useState<TriFilter>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [formPreviewOpen, setFormPreviewOpen] = useState(false);
  const [formPreviewLoading, setFormPreviewLoading] = useState(false);
  const [formPreviewError, setFormPreviewError] = useState("");
  const [formPreviewForms, setFormPreviewForms] = useState<PreviewForm[]>([]);
  const [formPreviewMeta, setFormPreviewMeta] = useState<{
    orderNumber: string;
    customerName: string;
    drawDate: string;
    isDouble: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (canManageOrders) {
        const o = await adminService.orders({
          status: filter || undefined,
          q: searchDebounced || undefined,
          has_scan: hasScanFilter ?? undefined,
          has_invoice: hasInvoiceFilter ?? undefined,
        });
        setOrders(o.orders);
        if (o.integrations) setIntegrations(o.integrations);
        if (o.logs) setIntegrationLogs(o.logs);
      } else if (legacyToken) {
        const o = await fetch("/api/admin/orders", { headers: legacyAdminHeader() }).then((r) =>
          r.ok ? r.json() : null,
        );
        setOrders(o?.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [canManageOrders, legacyToken, filter, searchDebounced, hasScanFilter, hasInvoiceFilter]);

  const viewFormSimulation = async (order: AdminOrder) => {
    if (!canManageOrders) return;
    setFormPreviewOpen(true);
    setFormPreviewLoading(true);
    setFormPreviewError("");
    setFormPreviewForms([]);
    setFormPreviewMeta({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || "",
      drawDate: order.drawDate,
      isDouble: false,
    });
    try {
      const data = await adminService.getFormPreview(order.id);
      setFormPreviewForms(data.forms);
      setFormPreviewMeta({
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        drawDate: data.drawDate,
        isDouble: data.isDouble,
      });
    } catch (e) {
      setFormPreviewError(extractApiError(e, "לא ניתן לטעון סימולציית טופס"));
    } finally {
      setFormPreviewLoading(false);
    }
  };

  const printOrder = async (orderId: number) => {
    if (!canManageOrders) return;
    setActionLoading(orderId);
    try {
      const res = await adminService.printOrder(orderId);
      showToast(res.detail || formatPrintSuccessMessage(res), "ok");
      setOrders((prev) =>
        prev.map((o) =>
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
      const docNumber = res.doc_number?.trim() || "";
      if (!docNumber) {
        const detail = (res.detail || "").trim();
        const looksLikeSuccess = /הונפקה/.test(detail);
        if (!looksLikeSuccess) {
          showToast(detail || "הנפקת חשבונית נכשלה — אין מספר מסמך מ-iCount", "err", 5000);
        }
        const logRes = await adminService.integrationLogs({ source: "icount", limit: 20 });
        setIntegrationLogs(logRes.logs);
        if (logRes.integrations) setIntegrations(logRes.integrations);
        return;
      }
      const issuedAt = res.invoice_issued_at || new Date().toISOString();
      const pdfLink = res.pdf_link?.trim();
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            icountDocNumber: docNumber,
            icountPdfLink: pdfLink || o.icountPdfLink,
            invoiceIssuedAt: issuedAt,
          };
        }),
      );
      const logRes = await adminService.integrationLogs({ limit: 30 });
      setIntegrationLogs(logRes.logs);
    } catch (e) {
      showToast(extractApiError(e, "הנפקת חשבונית נכשלה"), "err", 5000);
      try {
        const logRes = await adminService.integrationLogs({ source: "icount", limit: 20 });
        setIntegrationLogs(logRes.logs);
      } catch {
        /* ignore */
      }
    } finally {
      setActionLoading(null);
    }
  };

  const viewScan = async (order: AdminOrder) => {
    if (!order.hasScan) {
      alert("אין סריקה להזמנה זו — העלה סריקה דרך scan_app.");
      return;
    }
    setActionLoading(order.id);
    try {
      await adminService.openOrderScan(order.id);
    } catch (e) {
      alert(extractApiError(e, "לא ניתן לפתוח סריקה"));
    } finally {
      setActionLoading(null);
    }
  };

  const viewInvoice = async (order: AdminOrder) => {
    if (!canManageOrders) return;
    const link = order.icountPdfLink?.trim();
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    setActionLoading(order.id);
    try {
      const res = await adminService.getInvoice(order.id);
      if (res.pdf_link) {
        setOrders((prev) =>
          prev.map((o) =>
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
      alert(extractApiError(e, "לא ניתן לטעון את החשבונית"));
      setOrders((prev) =>
        prev.map((o) =>
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
        headers: { "Content-Type": "application/json", ...legacyAdminHeader() },
        body: JSON.stringify({ order_id: orderId, status }),
      });
    } else return;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  };

  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) setLegacyToken(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`toast toast-${toast.type === "err" ? "err" : "ok"}`}
        >
          {toast.msg}
        </div>
      )}

      {canManageOrders && <AdminOrderFlowGuide />}

      {canManageOrders && integrations && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, fontSize: ".72rem" }}>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--navy-b)",
              background: integrations.icount.configured
                ? "rgba(29,185,106,.12)"
                : "rgba(255,107,122,.12)",
              color: integrations.icount.configured ? "var(--green)" : "#ff6b7a",
            }}
          >
            iCount: {integrations.icount.configured ? "מחובר" : "לא מוגדר"}
            {integrations.icount.doctype ? ` · סוג ${integrations.icount.doctype}` : ""}
          </span>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--navy-b)",
              background: integrations.print.configured
                ? "rgba(29,185,106,.12)"
                : "rgba(255,179,71,.12)",
              color: integrations.print.configured ? "var(--green)" : "#ffb347",
            }}
          >
            הדפסה: {integrations.print.configured ? "מחובר" : "לא מוגדר"}
          </span>
          {!integrations.icount.configured && integrations.icount.hint && (
            <span style={{ color: "var(--muted)" }}>{integrations.icount.hint}</span>
          )}
        </div>
      )}

      {canManageOrders && (
        <div
          style={{
            background: "rgba(26,45,66,.85)",
            border: "1px solid var(--navy-b)",
            borderRadius: 14,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setLogsExpanded((v) => !v)}
            style={{
              width: "100%",
              padding: "11px 16px",
              border: "none",
              borderBottom: logsExpanded ? "1px solid var(--navy-b)" : "none",
              background: "transparent",
              color: "var(--cream)",
              fontFamily: "Heebo,sans-serif",
              fontSize: ".82rem",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "right",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>📋 לוג אינטגרציות (iCount / הדפסה)</span>
            <span style={{ color: "var(--muted)", fontSize: ".7rem" }}>
              {logsExpanded ? "הסתר" : "הצג"} · {integrationLogs.length}
            </span>
          </button>
          {logsExpanded && (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {integrationLogs.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: ".75rem",
                  }}
                >
                  אין רשומות עדיין — הנפק חשבונית או הדפסה כדי לראות לוגים
                </div>
              )}
              {integrationLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--navy-b)",
                    fontSize: ".7rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      color:
                        log.level === "error"
                          ? "#ff6b7a"
                          : log.level === "warning"
                            ? "#ffb347"
                            : "var(--green)",
                      fontWeight: 700,
                      minWidth: 52,
                    }}
                  >
                    {log.source === "icount"
                      ? "iCount"
                      : log.source === "print"
                        ? "הדפסה"
                        : log.source}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: ".62rem" }}>
                    {new Date(log.createdAt).toLocaleString("he-IL")}
                  </span>
                  {log.orderNumber && (
                    <span style={{ color: "var(--gold)" }}>{log.orderNumber}</span>
                  )}
                  <span style={{ color: "var(--cream)", flex: "1 1 200px" }}>{log.message}</span>
                  {Object.keys(log.details || {}).length > 0 && (
                    <details style={{ width: "100%", color: "var(--muted)", fontSize: ".62rem" }}>
                      <summary style={{ cursor: "pointer" }}>פרטים</summary>
                      <pre
                        style={{
                          margin: "4px 0 0",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontFamily: "monospace",
                        }}
                      >
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button
          onClick={() => loadData()}
          className="btn btn-outline"
          style={{ fontSize: ".72rem", marginRight: "auto" }}
        >
          🔄 רענן
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חיפוש הזמנה / לקוח — מספר הזמנה, שם, משתמש או טלפון"
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
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid var(--navy-b)",
              background: filter === s ? "var(--gold)" : "transparent",
              color: filter === s ? "var(--navy)" : "var(--muted)",
              fontFamily: "Heebo,sans-serif",
              fontSize: ".7rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {s ? STATUS_LABELS[s] : "הכל"}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "rgba(26,45,66,.85)",
          border: "1px solid var(--navy-b)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "11px 16px",
            borderBottom: "1px solid var(--navy-b)",
            fontWeight: 700,
            fontSize: ".82rem",
            color: "var(--cream)",
          }}
        >
          הזמנות ({orders.length})
        </div>
        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>טוען...</div>
        )}
        {orders.map((o) => (
          <div
            key={o.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              padding: "11px 16px",
              borderBottom: "1px solid var(--navy-b)",
              fontSize: ".76rem",
            }}
          >
            <div style={{ flex: "1 0 200px" }}>
              <div style={{ fontWeight: 700, color: "var(--gold)" }}>{o.orderNumber}</div>
              <div style={{ color: "var(--muted)", fontSize: ".68rem" }}>
                {o.user?.name}
                {o.user?.username ? ` (@${o.user.username})` : ""}
                {" · "}
                {o.user?.phone || o.user?.email}
              </div>
            </div>
            <div style={{ color: "var(--muted)" }}>{o.tablesCount} טבלאות</div>
            <div style={{ color: "var(--cream)" }}>₪{o.totalIls?.toFixed(2)}</div>
            <div style={{ color: "var(--muted)" }}>{o.drawDate}</div>
            <div style={{ color: orderStatusColor(o), fontWeight: 700, minWidth: 80 }}>
              {orderStatusLabel(o)}
            </div>
            {o.scannedAt && (
              <div style={{ color: "var(--muted)", fontSize: ".64rem" }}>
                נסרק {new Date(o.scannedAt).toLocaleDateString("he-IL")}
              </div>
            )}
            <select
              value={o.status}
              onChange={(e) => updateStatus(o.id, e.target.value)}
              style={{
                background: "var(--navy)",
                border: "1px solid var(--navy-b)",
                borderRadius: 7,
                color: "var(--cream)",
                fontFamily: "Heebo,sans-serif",
                fontSize: ".72rem",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {STATUS_ORDER.map((v) => (
                <option key={v} value={v}>
                  {STATUS_LABELS[v]}
                </option>
              ))}
            </select>
            {canManageOrders && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-gold"
                  style={{ fontSize: ".68rem", padding: "4px 10px" }}
                  disabled={actionLoading === o.id}
                  onClick={() => viewFormSimulation(o)}
                >
                  📋 הצג סימולציה של הטופס
                </button>
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
                  style={{ fontSize: ".68rem", padding: "4px 10px" }}
                  disabled={actionLoading === o.id}
                  onClick={() => viewInvoice(o)}
                >
                  📄 הצג חשבונית
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    fontSize: ".68rem",
                    padding: "4px 10px",
                    borderColor: "#8aaabe",
                    color: "#8aaabe",
                    opacity: o.hasScan ? 1 : 0.45,
                  }}
                  disabled={actionLoading === o.id || !o.hasScan}
                  onClick={() => viewScan(o)}
                >
                  {actionLoading === o.id ? "..." : "📄 הראה סריקה"}
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && orders.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: ".78rem",
            }}
          >
            אין הזמנות
          </div>
        )}
      </div>

      <OrderFormPreviewModal
        open={formPreviewOpen}
        onClose={() => setFormPreviewOpen(false)}
        orderNumber={formPreviewMeta?.orderNumber}
        customerName={formPreviewMeta?.customerName}
        drawDate={formPreviewMeta?.drawDate}
        isDouble={formPreviewMeta?.isDouble}
        forms={formPreviewForms}
        loading={formPreviewLoading}
        error={formPreviewError}
      />
    </>
  );
}
