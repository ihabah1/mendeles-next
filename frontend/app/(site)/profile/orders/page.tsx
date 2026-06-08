"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DEMO_ORDERS } from "@/lib/demo";
import {
  checkOrderWins,
  formatWinBadge,
  RANK_LABELS,
  type DrawResult,
} from "@/lib/lotto-wins";
import {
  contentService,
  extractApiError,
  mapApiOrders,
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

function OrdersPageInner() {
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [prizes, setPrizes] = useState<Record<string, { ils?: number }> | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<number | null>(null);

  useEffect(() => {
    const demo = localStorage.getItem("demo_mode") === "1";
    setIsDemo(demo);

    (async () => {
      try {
        const statsRes = await fetch("/api/stats");
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats?.last_draw) setDraw(stats.last_draw);
          if (stats?.prizes) setPrizes(stats.prizes);
        }
      } catch {
        /* optional */
      }

      if (demo) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOrders(DEMO_ORDERS as any);
        setLoading(false);
        return;
      }

      try {
        const page = await contentService.orders.list();
        setOrders(mapApiOrders(page.results));
      } catch (err) {
        setError(extractApiError(err, "שגיאה בטעינת ההזמנות"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const winByOrder = useMemo(() => {
    const map = new Map<number, ReturnType<typeof checkOrderWins>>();
    orders.forEach((o) => {
      map.set(o.id, checkOrderWins(o.sets, draw, prizes));
    });
    return map;
  }, [orders, draw, prizes]);

  const openInvoice = async (order: UiOrder) => {
    if (isDemo) {
      setError("חשבונית זמינה רק בחשבון אמיתי");
      return;
    }
    if (order.invoicePdfLink) {
      contentService.orders.openInvoiceLink(order.invoicePdfLink);
      return;
    }
    setInvoiceLoading(order.id);
    setError("");
    try {
      const inv = await contentService.orders.invoice(order.id);
      if (inv.pdf_link) {
        contentService.orders.openInvoiceLink(inv.pdf_link);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  hasInvoice: true,
                  invoicePdfLink: inv.pdf_link || "",
                  invoiceDocNumber: inv.doc_number || o.invoiceDocNumber,
                }
              : o,
          ),
        );
      } else {
        setError("חשבונית טרם הונפקה להזמנה זו");
      }
    } catch (err) {
      setError(extractApiError(err, "לא ניתן לפתוח חשבונית"));
    } finally {
      setInvoiceLoading(null);
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>טוען הזמנות...</div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 14px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>
              📋 ההזמנות שלי
            </h1>
            <p style={{ fontSize: ".78rem", color: "var(--text2)", margin: 0 }}>
              היסטוריה, טפסים, סטטוס זכייה וחשבוניות
            </p>
          </div>
          <Link href="/profile" className="btn btn-outline" style={{ fontSize: ".76rem" }}>
            ← חזרה לפרופיל
          </Link>
        </div>

        {isDemo && (
          <div className="card" style={{ padding: "10px 14px", marginBottom: 14, fontSize: ".74rem", color: "var(--gold-dark)", background: "var(--gold-bg)", border: "1px solid var(--gold-border)" }}>
            🧪 מצב דמו — נתונים לדוגמה בלבד
          </div>
        )}

        {error && (
          <div role="alert" style={{ background: "var(--red-bg)", border: "1px solid #f0b0b0", color: "var(--red)", borderRadius: 8, padding: "10px 12px", fontSize: ".78rem", marginBottom: 14 }}>
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
            <p style={{ color: "var(--text2)", fontSize: ".85rem", marginBottom: 14 }}>אין הזמנות עדיין</p>
            <Link href="/lotto" className="btn btn-gold">🎱 מלא טפסים עכשיו</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                <div key={o.id} className="lotto-panel">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "14px 16px",
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
                        {formatDate(o.createdAt)} · הגרלה {o.drawDate || "—"} · {formsCount} טבלאות · ₪{o.totalIls.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <span className={`badge ${o.status === "completed" || o.status === "paid" ? "badge-green" : "badge-gray"}`}>
                        {orderStatusLabel(o.status)}
                      </span>
                      {win && (
                        <div style={{ fontSize: ".68rem", color: win.bestRank ? "var(--green)" : "var(--muted)", marginTop: 6, maxWidth: 140 }}>
                          {formatWinBadge(win)}
                        </div>
                      )}
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
                        {o.hasScan && !isDemo && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              contentService.orders.openScanPdf(o.id).catch((err) =>
                                setError(extractApiError(err, "לא ניתן לפתוח סריקה")),
                              )
                            }
                          >
                            📄 צפה בטופס (סריקה)
                          </button>
                        )}
                        {(o.hasInvoice || o.invoicePdfLink) && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={invoiceLoading === o.id}
                            onClick={() => openInvoice(o)}
                          >
                            {invoiceLoading === o.id ? "טוען..." : "🧾 חשבונית"}
                            {o.invoiceDocNumber ? ` ${o.invoiceDocNumber}` : ""}
                          </button>
                        )}
                        {!o.hasInvoice && !o.invoicePdfLink && !isDemo && (
                          <span style={{ fontSize: ".7rem", color: "var(--muted)", alignSelf: "center" }}>
                            חשבונית תופיע לאחר הנפקה
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>
                        הטפסים שמילאת ({formsCount})
                      </div>

                      {o.sets.length === 0 ? (
                        <p style={{ fontSize: ".74rem", color: "var(--muted)" }}>אין פירוט טבלאות להזמנה זו</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                          {displaySets.map((s) => (
                            <div
                              key={s.setIndex}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                background: s.rank ? "var(--green-bg)" : "var(--bg3)",
                                border: `1px solid ${s.rank ? "#b0dfc0" : "var(--border)"}`,
                                borderRadius: 6,
                                fontSize: ".74rem",
                              }}
                            >
                              <span style={{ color: "var(--text)", fontFamily: "monospace", direction: "ltr", textAlign: "left" }}>
                                #{s.setIndex} {s.display}
                              </span>
                              <span style={{ color: s.rank ? "var(--green)" : "var(--muted)", fontSize: ".68rem", flexShrink: 0 }}>
                                {s.rank
                                  ? RANK_LABELS[s.rank]
                                  : `${s.hits} פגיעות${s.strongHit ? " +חזק" : ""}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(o.printedAt || o.scannedAt) && (
                        <div style={{ marginTop: 10, fontSize: ".68rem", color: "var(--muted)" }}>
                          {o.printedAt && <>הודפס: {formatDate(o.printedAt)} </>}
                          {o.scannedAt && <>· נסרק: {formatDate(o.scannedAt)}</>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function MyOrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageInner />
    </ProtectedRoute>
  );
}
