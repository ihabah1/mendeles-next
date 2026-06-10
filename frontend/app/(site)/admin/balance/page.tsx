"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import {
  balanceAdminService,
  type BalanceUser,
} from "@/lib/api/balance-admin";

export default function AdminBalancePage() {
  return (
    <ProtectedRoute adminOnly>
      <BalancePageInner />
    </ProtectedRoute>
  );
}

function BalancePageInner() {
  const [users, setUsers] = useState<BalanceUser[]>([]);
  const [selected, setSelected] = useState<BalanceUser | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"set" | "adjust">("adjust");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await balanceAdminService.listUsers({
        q: q.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.users);
      setSelected((prev) => {
        if (!prev) return null;
        return res.users.find((u) => u.id === prev.id) ?? prev;
      });
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינה"));
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (selected) {
      setAmount(
        mode === "set" ? String(selected.balanceIls) : "",
      );
    }
  }, [selected, mode]);

  const save = async () => {
    if (!selected) return;
    const parsed = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(parsed)) {
      setError("סכום לא תקין");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res =
        mode === "set"
          ? await balanceAdminService.setBalance(selected.id, parsed, note.trim() || undefined)
          : await balanceAdminService.adjustBalance(selected.id, parsed, note.trim() || undefined);
      setSelected(res.user);
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      const sign = res.deltaIls >= 0 ? "+" : "";
      setMessage(`יתרה עודכנה (${sign}₪${res.deltaIls.toFixed(2)}) — יתרה חדשה: ₪${res.user.balanceIls.toFixed(2)}`);
      if (mode === "adjust") setAmount("");
    } catch (e) {
      setError(extractApiError(e, "שגיאה בעדכון יתרה"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="page-wrap" style={{ maxWidth: 960 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← דשבורד
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: 0, flex: 1 }}>
            💳 ניהול יתרות
          </h1>
        </div>

        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 16, lineHeight: 1.6 }}>
          הזנת או שינוי יתרת ארנק לכל הלקוחות. כל שינוי נרשם ביומן הפעולות.
        </p>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}
        {message && <div className="result-pass" style={{ marginBottom: 12 }}>{message}</div>}

        <div className="lotto-panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="חיפוש לפי אימייל, שם, טלפון…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 200px" }}
          />
          <select
            className="input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="">כל המשתמשים</option>
            <option value="customer">לקוח</option>
            <option value="team">צוות</option>
          </select>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            🔄 רענן
          </button>
        </div>

        <div
          className="perm-grid"
          style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 14 }}
        >
          <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
            {loading && !users.length ? (
              <p style={{ padding: 16, color: "var(--muted)", fontSize: ".8rem" }}>טוען…</p>
            ) : !users.length ? (
              <p style={{ padding: 16, color: "var(--muted)", fontSize: ".8rem" }}>לא נמצאו משתמשים</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "right",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: selected?.id === u.id ? "rgba(201,168,76,.12)" : "transparent",
                    cursor: "pointer",
                    color: "var(--cream)",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: ".82rem" }}>{u.displayName || u.email}</div>
                  <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{u.email}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--gold)", marginTop: 4, fontWeight: 800 }}>
                    ₪{u.balanceIls.toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            {!selected ? (
              <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>בחר משתמש מהרשימה</p>
            ) : (
              <>
                <h2 style={{ fontSize: "1rem", margin: "0 0 4px", color: "var(--cream)" }}>
                  {selected.displayName || selected.email}
                </h2>
                <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "0 0 14px" }}>
                  {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </p>

                <div
                  style={{
                    background: "rgba(29,185,106,.1)",
                    border: "1px solid rgba(29,185,106,.25)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>יתרה נוכחית</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--gold)" }}>
                    ₪{selected.balanceIls.toFixed(2)}
                  </div>
                  <div style={{ fontSize: ".62rem", color: "var(--muted)", marginTop: 6 }}>
                    הפקדות: ₪{selected.totalTopupIls.toFixed(0)} · חיובים: ₪{selected.totalChargeIls.toFixed(0)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === "adjust" ? "btn-gold" : "btn-outline"}`}
                    onClick={() => setMode("adjust")}
                  >
                    הוסף / הורד
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === "set" ? "btn-gold" : "btn-outline"}`}
                    onClick={() => setMode("set")}
                  >
                    קבע יתרה
                  </button>
                </div>

                <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                  {mode === "set" ? "יתרה חדשה (₪)" : "סכום שינוי (₪, שלילי להורדה)"}
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={mode === "set" ? 0 : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={mode === "set" ? "0.00" : "לדוגמה: 100 או -50"}
                  style={{ marginBottom: 10 }}
                />

                <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                  הערה (אופציונלי)
                </label>
                <input
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="סיבת השינוי…"
                  style={{ marginBottom: 14 }}
                />

                {mode === "adjust" && amount && !Number.isNaN(parseFloat(amount)) && (
                  <p style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: 12 }}>
                    יתרה לאחר שינוי: ₪
                    {(selected.balanceIls + parseFloat(amount.replace(",", "."))).toFixed(2)}
                  </p>
                )}

                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={save}
                  disabled={saving || !amount.trim()}
                  style={{ width: "100%" }}
                >
                  {saving ? "שומר…" : "עדכן יתרה"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
