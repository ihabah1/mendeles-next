"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import MyOrdersList from "@/components/MyOrdersList";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DEMO_ORDERS } from "@/lib/demo";
import type { DrawResult } from "@/lib/lotto-wins";
import {
  contentService,
  extractApiError,
  mapApiOrders,
  type UiOrder,
} from "@/lib/api";

function OrdersPageInner() {
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [draw, setDraw] = useState<DrawResult | null>(null);
  const [prizes, setPrizes] = useState<Record<string, { ils?: number }> | null>(null);

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

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 14px 60px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.35rem",
                fontWeight: 900,
                color: "var(--text)",
                marginBottom: 4,
              }}
            >
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
          <div
            className="card"
            style={{
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: ".74rem",
              color: "var(--gold-dark)",
              background: "var(--gold-bg)",
              border: "1px solid var(--gold-border)",
            }}
          >
            🧪 מצב דמו — נתונים לדוגמה בלבד
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: "var(--red-bg)",
              border: "1px solid #f0b0b0",
              color: "var(--red)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".78rem",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <div className="card" style={{ padding: "12px 10px 14px" }}>
          <MyOrdersList
            orders={orders}
            draw={draw}
            prizes={prizes}
            isDemo={isDemo}
            loading={loading}
            onError={setError}
          />
        </div>
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
