"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import BalancePill from "@/components/BalancePill";
import Link from "next/link";
import { DEMO_USER, DEMO_TRANSACTIONS, DEMO_ORDERS } from "@/lib/demo";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  contentService,
  extractApiError,
  walletService,
} from "@/lib/api";
import type { UiTransaction } from "@/lib/api";

interface UserData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

function ProfilePageInner() {
  const router = useRouter();
  const { user: authUser, logout: authLogout } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [balance, setBalance] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [txs, setTxs] = useState<UiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const demo = localStorage.getItem("demo_mode") === "1";
    setIsDemo(demo);

    if (demo) {
      setUser({
        id: 0,
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        phone: DEMO_USER.phone,
        createdAt: new Date().toISOString(),
      });
      setBalance(DEMO_USER.balance);
      setOrdersCount(DEMO_ORDERS.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTxs(DEMO_TRANSACTIONS as any);
      setLoading(false);
      return;
    }

    if (!authUser) return;

    setUser({
      id: authUser.id,
      name: authUser.display_name || authUser.full_name || authUser.email,
      email: authUser.email,
      phone: authUser.phone,
      createdAt: authUser.date_joined,
    });

    (async () => {
      try {
        const [wallet, orderPage, history] = await Promise.all([
          walletService.balance(),
          contentService.orders.list(),
          walletService.history(),
        ]);
        setBalance(wallet.balance);
        setOrdersCount(orderPage.count ?? orderPage.results.length);
        setTxs(history);
      } catch (err) {
        setError(extractApiError(err, "שגיאה בטעינת הנתונים"));
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  const logout = async () => {
    await authLogout().catch(() => {});
    localStorage.removeItem("demo_mode");
    router.push("/");
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
          טוען...
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 14px 60px" }}>
        {error && (
          <div
            style={{
              background: "rgba(232,0,30,.1)",
              border: "1px solid rgba(232,0,30,.3)",
              color: "#ff6b7a",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: ".78rem",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {isDemo && (
          <div
            style={{
              background: "rgba(232,160,48,.1)",
              border: "1px solid rgba(232,160,48,.3)",
              borderRadius: 9,
              padding: "8px 14px",
              marginBottom: 14,
              fontSize: ".74rem",
              color: "#e8c870",
            }}
          >
            🧪 <strong>מצב דמו</strong> — הנתונים הם לדוגמה בלבד.{" "}
            <Link
              href="/auth"
              style={{ color: "var(--gold)", textDecoration: "underline" }}
            >
              התחבר עם חשבון אמיתי
            </Link>{" "}
            לראות הזמנות אמיתיות.
          </div>
        )}

        <div
          style={{
            background: "rgba(26,45,66,.85)",
            border: "1px solid var(--navy-b)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Frank Ruhl Libre',serif",
                fontSize: "1.1rem",
                fontWeight: 900,
                color: "var(--cream)",
              }}
            >
              {user?.name}
            </div>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 3 }}>
              {user?.email || user?.phone}
            </div>
          </div>
          <BalancePill balance={balance} name={user?.name} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/lotto"
              className="btn btn-gold"
              style={{ fontSize: ".78rem" }}
            >
              🎱 מלא טפסים
            </Link>
            <Link
              href="/topup"
              className="btn btn-outline"
              style={{ fontSize: ".78rem" }}
            >
              💳 טעינה
            </Link>
            <button
              className="btn btn-outline"
              onClick={logout}
              style={{ fontSize: ".78rem" }}
            >
              התנתק
            </button>
          </div>
        </div>

        <Link
          href="/profile/orders"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "rgba(26,45,66,.85)",
            border: "1px solid var(--navy-b)",
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 16,
            textDecoration: "none",
            transition: "border-color .15s",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--cream)", marginBottom: 4 }}>
              📋 ההזמנות שלי
            </div>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", lineHeight: 1.5 }}>
              היסטוריה · טפסים שמולאו · צפייה בטפסים · סטטוס זכייה · חשבוניות
            </div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <span
              style={{
                display: "inline-block",
                background: "rgba(201,168,76,.15)",
                border: "1px solid rgba(201,168,76,.35)",
                color: "var(--gold-l)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: ".78rem",
                fontWeight: 700,
              }}
            >
              {ordersCount}
            </span>
            <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 4 }}>צפה ←</div>
          </div>
        </Link>

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
              padding: "12px 16px",
              borderBottom: "1px solid var(--navy-b)",
              fontWeight: 700,
              fontSize: ".82rem",
              color: "var(--cream)",
            }}
          >
            היסטוריית עסקאות
          </div>
          {txs.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--muted)",
                fontSize: ".78rem",
              }}
            >
              אין עסקאות
            </div>
          ) : (
            txs.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--navy-b)",
                  fontSize: ".76rem",
                }}
              >
                <div style={{ color: "var(--muted)" }}>{t.description}</div>
                <div
                  style={{
                    fontWeight: 700,
                    color: t.amountIls > 0 ? "var(--green)" : "#ff6b7a",
                  }}
                >
                  {t.amountIls > 0 ? "+" : ""}₪{t.amountIls.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageInner />
    </ProtectedRoute>
  );
}
