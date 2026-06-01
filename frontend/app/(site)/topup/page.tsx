"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import { walletService } from "@/lib/api/wallet";

const AMOUNTS = [50, 100, 200, 500];

function TopupPageInner() {
  const router = useRouter();
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const finalAmount = custom ? parseInt(custom, 10) : amount;

  const handleTopup = async () => {
    if (finalAmount < 10 || finalAmount > 5000) {
      setError("סכום לא תקין (10–5000)");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await walletService.topup(finalAmount);
      if (result.dev_mode) {
        setSuccess(`נטענו ₪${result.amount_ils} לארנק. יתרה: ₪${result.balance?.toFixed(2)}`);
      } else if (result.client_secret) {
        alert(
          `Payment Intent נוצר: ${result.payment_id}\nבפרודקשן: Stripe.js יאשר את התשלום`,
        );
      }
    } catch (err) {
      setError(extractApiError(err, "שגיאה בטעינת הארנק"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "40px 16px" }}>
        <h1
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.4rem",
            fontWeight: 900,
            color: "var(--cream)",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          💳 טעינת ארנק
        </h1>

        <div
          style={{
            background: "rgba(26,45,66,.85)",
            border: "1px solid var(--navy-b)",
            borderRadius: 14,
            padding: "20px 18px",
          }}
        >
          <div style={{ fontSize: ".8rem", color: "var(--muted)", marginBottom: 12 }}>
            בחר סכום:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAmount(a);
                  setCustom("");
                }}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  border: `1.5px solid ${amount === a && !custom ? "var(--gold)" : "var(--navy-b)"}`,
                  background:
                    amount === a && !custom
                      ? "rgba(201,168,76,.12)"
                      : "transparent",
                  color:
                    amount === a && !custom ? "var(--gold)" : "var(--muted)",
                  fontFamily: "Heebo,sans-serif",
                  fontSize: ".82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ₪{a}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            type="number"
            placeholder="סכום אחר (10–5000)"
            style={{
              width: "100%",
              background: "var(--navy)",
              border: "1px solid var(--navy-b)",
              borderRadius: 8,
              color: "var(--cream)",
              fontFamily: "Heebo,sans-serif",
              fontSize: ".9rem",
              padding: "9px 12px",
              textAlign: "right",
              marginBottom: 14,
            }}
          />

          {error && (
            <div style={{ color: "#ff6b7a", fontSize: ".76rem", marginBottom: 10 }}>
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                color: "var(--green)",
                fontSize: ".76rem",
                marginBottom: 10,
              }}
            >
              {success}
            </div>
          )}

          <button
            className="btn btn-gold"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: 13,
              fontSize: ".95rem",
            }}
            onClick={handleTopup}
            disabled={loading}
          >
            {loading ? "..." : `טען ₪${finalAmount} לארנק`}
          </button>

          <div
            style={{
              fontSize: ".68rem",
              color: "var(--muted)",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            תשלום מאובטח באמצעות Stripe (או טעינה מיידית במצב פיתוח)
          </div>
        </div>

        <button
          className="btn btn-outline"
          style={{ marginTop: 14 }}
          onClick={() => router.back()}
        >
          ← חזרה
        </button>
      </div>
    </>
  );
}

export default function TopupPage() {
  return (
    <ProtectedRoute>
      <TopupPageInner />
    </ProtectedRoute>
  );
}
