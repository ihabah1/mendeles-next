"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import OrderFormPreviewModal from "@/components/admin/OrderFormPreviewModal";
import type { PreviewForm } from "@/components/admin/LottoFormPreview";
import {
  checkOrderWins,
  formatWinBadge,
  RANK_LABELS,
  type DrawResult,
} from "@/lib/lotto-wins";
import { formsFromOrderSets } from "@/lib/lotto/forms-from-sets";
import {
  contentService,
  extractApiError,
  orderStatusLabel,
  type UiOrder,
} from "@/lib/api";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

interface MyOrdersListProps {
  orders: UiOrder[];
  draw: DrawResult | null;
  prizes?: Record<string, { ils?: number }> | null;
  isDemo?: boolean;
  loading?: boolean;
  onError?: (msg: string) => void;
  emptyCta?: boolean;
}

export default function MyOrdersList({
  orders,
  draw,
  prizes = null,
  isDemo = false,
  loading = false,
  onError,
  emptyCta = true,
}: MyOrdersListProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<number | null>(null);
  const [formPreviewOrder, setFormPreviewOrder] = useState<UiOrder | null>(null);

  const winByOrder = useMemo(() => {
    const map = new Map<number, ReturnType<typeof checkOrderWins>>();
    orders.forEach((o) => {
      map.set(o.id, checkOrderWins(o.sets, draw, prizes));
    });
    return map;
  }, [orders, draw, prizes]);

  const reportError = (msg: string) => onError?.(msg);

  const formPreviewForms: PreviewForm[] = useMemo(
    () => (formPreviewOrder ? formsFromOrderSets(formPreviewOrder.sets) : []),
    [formPreviewOrder],
  );

  const openInvoice = async (order: UiOrder) => {
    if (isDemo) {
      reportError("חשבונית זמינה רק בחשבון אמיתי");
      return;
    }
    if (order.invoicePdfLink) {
      contentService.orders.openInvoiceLink(order.invoicePdfLink);
      return;
    }
    setInvoiceLoading(order.id);
    try {
      const inv = await contentService.orders.invoice(order.id);
      if (inv.pdf_link) {
        contentService.orders.openInvoiceLink(inv.pdf_link);
      } else {
        reportError("חשבונית טרם הונפקה להזמנה זו");
      }
    } catch (err) {
      reportError(extractApiError(err, "לא ניתן לפתוח חשבונית"));
    } finally {
      setInvoiceLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: ".8rem" }}>
        טוען הזמנות...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>📭</div>
        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 12 }}>אין הזמנות עדיין</p>
        {emptyCta && (
          <Link href="/lotto" className="btn btn-gold" style={{ fontSize: ".78rem" }}>
            🎱 מלא טפסים עכשיו
          </Link>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: ".7rem", color: "var(--muted)", margin: "0 4px 2px", lineHeight: 1.45 }}>
        לחץ על הזמנה לפירוט הטפסים · סריקה · חשבונית · בדיקת זכייה
      </p>

      {orders.map((o) => {
        const win = winByOrder.get(o.id);
        const isOpen = expanded === o.id;
        const formsCount = o.sets.length || o.tablesCount;
        const displaySets =
          win?.sets?.length
            ? win.sets
            : o.sets.map((set, idx) => ({
                setIndex: set.set_index ?? idx + 1,
                display: set.display || "—",
                rank: null as string | null,
                hits: 0,
                strongHit: false,
              }));

        return (
          <div key={o.id} className="lotto-panel" style={{ overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : o.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                padding: "12px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lotto-panel-title" style={{ color: "var(--gold-dark)" }}>
                  {o.orderNumber}
                </div>
                <div className="lotto-panel-sub">
                  {formatDate(o.createdAt)} · הגרלה {o.drawDate || "—"} · {formsCount} טבלאות · ₪
                  {o.totalIls.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: "left", flexShrink: 0 }}>
                <span
                  className={`badge ${
                    o.status === "completed" || o.status === "paid" ? "badge-green" : "badge-gray"
                  }`}
                >
                  {orderStatusLabel(o.status)}
                </span>
                {win && (
                  <div
                    style={{
                      fontSize: ".66rem",
                      color: win.bestRank ? "var(--green)" : "var(--muted)",
                      marginTop: 5,
                      maxWidth: 130,
                    }}
                  >
                    {formatWinBadge(win)}
                  </div>
                )}
              </div>
              <span style={{ color: "var(--muted)", fontSize: ".85rem", paddingTop: 2 }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: "0 14px 10px",
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: ".66rem", padding: "4px 8px" }}
                onClick={() => setExpanded(isOpen ? null : o.id)}
              >
                {isOpen ? "סגור" : "📋 טפסים"}
              </button>
              {o.sets.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: ".66rem", padding: "4px 8px" }}
                  title="הצג סימולציית טופס"
                  aria-label="הצג סימולציית טופס"
                  onClick={() => setFormPreviewOrder(o)}
                >
                  👁 הצג
                </button>
              )}
              {o.hasScan && !isDemo && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: ".66rem", padding: "4px 8px" }}
                  onClick={() =>
                    contentService.orders.openScanPdf(o.id).catch((err) =>
                      reportError(extractApiError(err, "לא ניתן לפתוח סריקה")),
                    )
                  }
                >
                  📄 סריקה
                </button>
              )}
              {(o.hasInvoice || o.invoicePdfLink) ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: ".66rem", padding: "4px 8px" }}
                  disabled={invoiceLoading === o.id}
                  onClick={() => openInvoice(o)}
                >
                  {invoiceLoading === o.id ? "..." : "🧾 חשבונית"}
                </button>
              ) : (
                !isDemo && (
                  <span style={{ fontSize: ".64rem", color: "var(--muted)", alignSelf: "center" }}>
                    חשבונית — בהמתנה
                  </span>
                )
              )}
            </div>

            {isOpen && (
              <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
                <div
                  style={{
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "var(--text2)",
                    margin: "10px 0 8px",
                  }}
                >
                  הטפסים שמילאת ({formsCount})
                </div>

                {o.sets.length === 0 ? (
                  <p style={{ fontSize: ".74rem", color: "var(--muted)" }}>אין פירוט טבלאות</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {displaySets.map((s) => (
                      <div
                        key={s.setIndex}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          background: s.rank ? "var(--green-bg)" : "var(--bg3)",
                          border: `1px solid ${s.rank ? "#b0dfc0" : "var(--border)"}`,
                          borderRadius: 6,
                          fontSize: ".72rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text)",
                            fontFamily: "monospace",
                            direction: "ltr",
                            textAlign: "left",
                          }}
                        >
                          #{s.setIndex} {s.display}
                        </span>
                        <span
                          style={{
                            color: s.rank ? "var(--green)" : "var(--muted)",
                            fontSize: ".66rem",
                            flexShrink: 0,
                          }}
                        >
                          {s.rank
                            ? RANK_LABELS[s.rank]
                            : `${s.hits} פגיעות${s.strongHit ? " +חזק" : ""}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(o.printedAt || o.scannedAt) && (
                  <div style={{ marginTop: 8, fontSize: ".66rem", color: "var(--muted)" }}>
                    {o.printedAt && <>הודפס: {formatDate(o.printedAt)} </>}
                    {o.scannedAt && <>· נסרק: {formatDate(o.scannedAt)}</>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <OrderFormPreviewModal
        open={formPreviewOrder != null}
        onClose={() => setFormPreviewOrder(null)}
        orderNumber={formPreviewOrder?.orderNumber}
        drawDate={formPreviewOrder?.drawDate}
        isDouble={formPreviewOrder?.isDouble}
        forms={formPreviewForms}
        error={
          formPreviewOrder && formPreviewForms.length === 0
            ? "אין נתוני טופס להצגה"
            : undefined
        }
      />
    </div>
  );
}
