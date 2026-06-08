"use client";

import { useState } from "react";
import { extractApiError } from "@/lib/api/client";
import { walletService } from "@/lib/api/wallet";

const AMOUNTS = [50, 100, 200, 500];

export default function TopupPanel() {
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
        setSuccess("בקשת תשלום נוצרה — השלמת Stripe תתווסף בקרוב.");
      }
    } catch (err) {
      setError(extractApiError(err, "שגיאה בטעינת הארנק"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="profile-panel-title">💳 טעינת כסף לארנק</h2>
      <p className="profile-panel-desc">בחר סכום לטעינה מאובטחת לארנק שלך</p>

      <div className="topup-grid">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            className={`topup-amt${amount === a && !custom ? " selected" : ""}`}
            onClick={() => {
              setAmount(a);
              setCustom("");
            }}
          >
            ₪{a}
          </button>
        ))}
      </div>

      <input
        className="input"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        type="number"
        placeholder="סכום אחר (10–5000)"
        style={{ marginBottom: 14 }}
      />

      {error && <div className="profile-alert error">{error}</div>}
      {success && <div className="profile-alert success">{success}</div>}

      <button
        type="button"
        className="btn btn-gold"
        style={{ width: "100%", justifyContent: "center", padding: 12 }}
        onClick={handleTopup}
        disabled={loading}
      >
        {loading ? "טוען..." : `טען ₪${finalAmount || 0} לארנק`}
      </button>

      <p className="profile-hint">תשלום מאובטח (Stripe) · במצב פיתוח: טעינה מיידית</p>
    </div>
  );
}
