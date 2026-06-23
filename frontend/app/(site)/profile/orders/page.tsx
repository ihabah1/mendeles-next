"use client";

import { useEffect, useMemo, useState } from "react";
import PersonalAreaPanel from "@/components/profile/PersonalAreaPanel";
import { useAuth } from "@/lib/auth/AuthContext";
import { DEMO_ORDERS, DEMO_SETS, DEMO_TRANSACTIONS } from "@/lib/demo";
import type { DrawResult } from "@/lib/lotto-wins";
import {
  contentService,
  extractApiError,
  mapApiOrders,
  type UiOrder,
} from "@/lib/api";
import { lottoService, type LottoSetRow } from "@/lib/api/lotto";
import { walletService, type WalletTransaction } from "@/lib/api/wallet";
import type { DrawContext } from "@/lib/profile/order-filters";

export default function ProfileOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [premiumSets, setPremiumSets] = useState<LottoSetRow[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [prizes, setPrizes] = useState<Record<string, { ils?: number }> | null>(null);
  const [drawCtx, setDrawCtx] = useState<DrawContext>({
    lastLotteryId: null,
    lastDrawDate: null,
  });

  useEffect(() => {
    const demo = localStorage.getItem("demo_mode") === "1";
    setIsDemo(demo);

    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (stats?.last_draw) {
          setDraw(stats.last_draw);
          setDrawCtx({
            lastLotteryId: stats.last_draw.lottery_id ?? null,
            lastDrawDate: stats.last_draw.date?.slice(0, 10) ?? null,
          });
        }
        if (stats?.prizes) setPrizes(stats.prizes);
      })
      .catch(() => {});

    if (demo) {
      setOrders(DEMO_ORDERS as unknown as UiOrder[]);
      setTransactions(DEMO_TRANSACTIONS as unknown as WalletTransaction[]);
      setPremiumSets(DEMO_SETS.slice(0, 12));
      setIsPremium(true);
      setLoading(false);
      return;
    }

    Promise.all([
      contentService.orders.list().then((page) => mapApiOrders(page.results)),
      walletService.history().catch(() => [] as WalletTransaction[]),
      lottoService.mySets().catch(() => ({ sets: [], count: 0, tier: "registered" as const })),
    ])
      .then(([orderRows, txRows, setsRes]) => {
        setOrders(orderRows);
        setTransactions(txRows);
        setPremiumSets(setsRes.sets);
        setIsPremium(setsRes.tier === "premium");
      })
      .catch((err) => setError(extractApiError(err, "שגיאה בטעינת האזור האישי")))
      .finally(() => setLoading(false));
  }, []);

  const displayName = useMemo(
    () => user?.display_name || user?.full_name || user?.email?.split("@")[0] || "משתמש",
    [user],
  );

  return (
    <div>
      {isDemo && (
        <div className="profile-alert warn" style={{ marginBottom: 12 }}>
          מצב דמו — נתונים לדוגמה
        </div>
      )}

      {error && <div className="profile-alert error">{error}</div>}

      <PersonalAreaPanel
        displayName={displayName}
        orders={orders}
        transactions={transactions}
        premiumSets={premiumSets}
        isPremium={isPremium}
        draw={draw}
        drawCtx={drawCtx}
        prizes={prizes}
        isDemo={isDemo}
        loading={loading}
        onError={setError}
      />
    </div>
  );
}
