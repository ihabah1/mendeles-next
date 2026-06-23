"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  contentService,
  extractApiError,
  orderStatusLabel,
  type UiOrder,
} from "@/lib/api";
import type { LottoSetRow } from "@/lib/api/lotto";
import type { WalletTransaction } from "@/lib/api/wallet";
import {
  checkOrderWins,
  formatWinBadge,
  type DrawResult,
} from "@/lib/lotto-wins";
import {
  type DrawContext,
  formatOrderDate,
  gameAndDrawLabel,
  isOrderActive,
  submissionStatusLabel,
} from "@/lib/profile/order-filters";

export type PersonalAreaTab =
  | "active"
  | "history"
  | "scanned"
  | "sets"
  | "wins"
  | "withdrawals"
  | "card"
  | "refund";

const TABS: { id: PersonalAreaTab; label: string; premiumOnly?: boolean }[] = [
  { id: "active", label: "טפסים פעילים" },
  { id: "history", label: "היסטוריה" },
  { id: "scanned", label: "טפסים סרוקים" },
  { id: "sets", label: "הסטים שלי", premiumOnly: true },
  { id: "wins", label: "זכויות" },
  { id: "withdrawals", label: "משיכות" },
  { id: "card", label: "חיובים בכרטיס אשראי" },
  { id: "refund", label: "החזר כספי" },
];

type PersonalAreaPanelProps = {
  displayName: string;
  orders: UiOrder[];
  transactions: WalletTransaction[];
  premiumSets: LottoSetRow[];
  isPremium: boolean;
  draw: DrawResult | null;
  drawCtx: DrawContext;
  prizes?: Record<string, { ils?: number }> | null;
  isDemo?: boolean;
  loading?: boolean;
  onError?: (msg: string) => void;
};

function EmptyState({
  greeting,
  message,
  showCta,
}: {
  greeting: string;
  message: string;
  showCta?: boolean;
}) {
  return (
    <div className="personal-area-empty">
      <p className="personal-area-greeting">{greeting}</p>
      <p className="personal-area-empty-msg">{message}</p>
      {showCta && (
        <Link href="/lotto" className="btn personal-area-cta">
          שלח טופס
        </Link>
      )}
    </div>
  );
}

export default function PersonalAreaPanel({
  displayName,
  orders,
  transactions,
  premiumSets,
  isPremium,
  draw,
  drawCtx,
  prizes = null,
  isDemo = false,
  loading = false,
  onError,
}: PersonalAreaPanelProps) {
  const [tab, setTab] = useState<PersonalAreaTab>("active");

  const visibleTabs = TABS.filter((t) => !t.premiumOnly || isPremium);

  const activeOrders = useMemo(
    () => orders.filter((o) => isOrderActive(o, drawCtx)),
    [orders, drawCtx],
  );
  const historyOrders = useMemo(
    () => orders.filter((o) => !isOrderActive(o, drawCtx)),
    [orders, drawCtx],
  );
  const scannedOrders = useMemo(() => orders.filter((o) => o.hasScan), [orders]);

  const winTx = useMemo(
    () => transactions.filter((t) => t.type.includes("win")),
    [transactions],
  );
  const withdrawTx = useMemo(
    () => transactions.filter((t) => t.type.includes("withdraw")),
    [transactions],
  );
  const chargeTx = useMemo(
    () => transactions.filter((t) => t.type === "charge" || t.amountIls < 0),
    [transactions],
  );
  const refundTx = useMemo(
    () => transactions.filter((t) => t.type.includes("refund")),
    [transactions],
  );

  const greeting = `שלום ${displayName.split(" ")[0] || displayName}`;

  const openScan = (orderId: number) => {
    if (isDemo) {
      onError?.("סריקה זמינה רק בחשבון אמיתי");
      return;
    }
    contentService.orders
      .openScanPdf(orderId)
      .catch((err) => onError?.(extractApiError(err, "לא ניתן לפתוח סריקה")));
  };

  if (loading) {
    return (
      <div className="personal-area-loading">טוען את האזור האישי...</div>
    );
  }

  return (
    <div className="personal-area">
      <nav className="personal-area-tabs" aria-label="אזור אישי">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`personal-area-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="personal-area-table-wrap">
        {(tab === "active" || tab === "history" || tab === "scanned") && (
          <>
            <table className="personal-area-table">
              <thead>
                <tr>
                  <th>משחק ומספר הגרלה</th>
                  <th>תאריך</th>
                  <th>(₪) עלות הטופס</th>
                  <th>סטטוס שליחה</th>
                  {tab === "scanned" && <th>סריקה</th>}
                </tr>
              </thead>
              <tbody>
                {(tab === "active"
                  ? activeOrders
                  : tab === "history"
                    ? historyOrders
                    : scannedOrders
                ).map((o) => (
                  <tr key={o.id}>
                    <td>{gameAndDrawLabel(o)}</td>
                    <td>{formatOrderDate(o.createdAt)}</td>
                    <td>₪{o.totalIls.toFixed(2)}</td>
                    <td>{submissionStatusLabel(o.status, Boolean(o.hasScan))}</td>
                    {tab === "scanned" && (
                      <td>
                        <button
                          type="button"
                          className="personal-area-link-btn"
                          onClick={() => openScan(o.id)}
                        >
                          הצג PDF
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {tab === "active" && activeOrders.length === 0 && (
              <EmptyState
                greeting={greeting}
                message="אין ברשותך טפסים פעילים"
                showCta
              />
            )}
            {tab === "history" && historyOrders.length === 0 && (
              <EmptyState greeting={greeting} message="אין היסטוריית טפסים" />
            )}
            {tab === "scanned" && scannedOrders.length === 0 && (
              <EmptyState
                greeting={greeting}
                message="טרם נסרקו טפסים עבורך — הסריקה תופיע כאן לאחר הגשה לדוכן"
              />
            )}
          </>
        )}

        {tab === "sets" && (
          <>
            <table className="personal-area-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>תאריך הגרלה</th>
                  <th>מספרים</th>
                  <th>חזק</th>
                </tr>
              </thead>
              <tbody>
                {premiumSets.map((s) => (
                  <tr key={`${s.draw_date}-${s.set_index}`}>
                    <td>{s.set_index}</td>
                    <td>{s.draw_date || "—"}</td>
                    <td dir="ltr" style={{ textAlign: "left" }}>
                      {[s.n1, s.n2, s.n3, s.n4, s.n5, s.n6].join(" ")}
                    </td>
                    <td>{s.strong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {premiumSets.length === 0 && (
              <EmptyState
                greeting={greeting}
                message="אין סטים משויכים — מנוי פרימיום כולל 200 צירופים להגרלה"
                showCta
              />
            )}
          </>
        )}

        {tab === "wins" && (
          <>
            <table className="personal-area-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>תיאור</th>
                  <th>סכום (₪)</th>
                  <th>הזמנה</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .map((o) => {
                    const win = checkOrderWins(o.sets, draw, prizes);
                    if (!win.bestRank) return null;
                    return (
                      <tr key={`win-${o.id}`}>
                        <td>{formatOrderDate(o.createdAt)}</td>
                        <td>{formatWinBadge(win)}</td>
                        <td>—</td>
                        <td>{o.orderNumber}</td>
                      </tr>
                    );
                  })
                  .filter(Boolean)}
                {winTx.map((t) => (
                  <tr key={`tx-${t.id}`}>
                    <td>{formatOrderDate(t.createdAt)}</td>
                    <td>זיכוי זכייה לארנק</td>
                    <td>₪{Math.abs(t.amountIls).toFixed(2)}</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {winTx.length === 0 &&
              !orders.some((o) => checkOrderWins(o.sets, draw, prizes).bestRank) && (
                <EmptyState greeting={greeting} message="אין זכויות רשומות" />
              )}
          </>
        )}

        {(tab === "withdrawals" || tab === "card" || tab === "refund") && (
          <>
            <table className="personal-area-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>סוג</th>
                  <th>סכום (₪)</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "withdrawals"
                  ? withdrawTx
                  : tab === "card"
                    ? chargeTx
                    : refundTx
                ).map((t) => (
                  <tr key={t.id}>
                    <td>{formatOrderDate(t.createdAt)}</td>
                    <td>{t.description || t.type}</td>
                    <td>₪{Math.abs(t.amountIls).toFixed(2)}</td>
                    <td>{orderStatusLabel("completed")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tab === "withdrawals" && withdrawTx.length === 0 && (
              <EmptyState greeting={greeting} message="לא בוצעו משיכות" />
            )}
            {tab === "card" && chargeTx.length === 0 && (
              <EmptyState greeting={greeting} message="אין חיובים בכרטיס אשראי" />
            )}
            {tab === "refund" && refundTx.length === 0 && (
              <EmptyState greeting={greeting} message="אין החזרים כספיים" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
