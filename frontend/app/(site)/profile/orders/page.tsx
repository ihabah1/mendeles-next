"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MyOrdersList from "@/components/MyOrdersList";
import { DEMO_ORDERS } from "@/lib/demo";
import type { DrawResult } from "@/lib/lotto-wins";
import {
  contentService,
  extractApiError,
  mapApiOrders,
  type UiOrder,
} from "@/lib/api";

export default function ProfileOrdersPage() {
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [prizes, setPrizes] = useState<Record<string, { ils?: number }> | null>(null);

  useEffect(() => {
    const demo = localStorage.getItem("demo_mode") === "1";
    setIsDemo(demo);

    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (stats?.last_draw) setDraw(stats.last_draw);
        if (stats?.prizes) setPrizes(stats.prizes);
      })
      .catch(() => {});

    if (demo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrders(DEMO_ORDERS as any);
      setLoading(false);
      return;
    }

    contentService.orders
      .list()
      .then((page) => setOrders(mapApiOrders(page.results)))
      .catch((err) => setError(extractApiError(err, "שגיאה בטעינת ההזמנות")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="profile-panel-title">📋 היסטוריית רכישות</h2>
      <p className="profile-panel-desc">
        הזמנות, טפסים שמולאו, סריקות, זכיות וחשבוניות
      </p>

      {isDemo && (
        <div className="profile-alert warn" style={{ marginBottom: 12 }}>
          🧪 מצב דמו — נתונים לדוגמה
        </div>
      )}

      {error && <div className="profile-alert error">{error}</div>}

      <MyOrdersList
        orders={orders}
        draw={draw}
        prizes={prizes}
        isDemo={isDemo}
        loading={loading}
        onError={setError}
        emptyCta
      />

      {!loading && orders.length === 0 && !error && (
        <Link href="/lotto" className="btn btn-gold" style={{ marginTop: 12 }}>
          🎱 מלא טפסים
        </Link>
      )}
    </div>
  );
}
