"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { extractApiError } from "@/lib/api/client";
import { balanceAdminService } from "@/lib/api/balance-admin";
import {
  permissionsAdminService,
  type ManagedUser,
  type PermissionRow,
} from "@/lib/api/permissions-admin";

export default function AdminPermissionsPage() {
  return (
    <ProtectedRoute adminOnly>
      <PermissionsPageInner />
    </ProtectedRoute>
  );
}

function PermissionsPageInner() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await permissionsAdminService.listUsers({
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
    setBalanceAmount("");
    setBalanceNote("");
  }, [selected?.id]);

  const run = async (fn: () => Promise<ManagedUser>, okMsg: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await fn();
      setSelected(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage(okMsg);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בשמירה"));
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
            🔐 מתן הרשאות
          </h1>
        </div>

        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 16, lineHeight: 1.6 }}>
          ניהול הרשאות ללקוחות וחברי צוות — כולל הפעלת <strong>Premium</strong>, גישה לארנק, הדפסה ועוד.
          {isAdmin ? " מנהל ראשי יכול גם להגדיר חברי צוות." : " שינוי תפקיד צוות — מנהל בלבד."}
        </p>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}
        {message && <div className="result-pass" style={{ marginBottom: 12 }}>{message}</div>}

        <div className="lotto-panel" style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder="חיפוש לפי אימייל, שם או טלפון…"
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
            <option value="">כל התפקידים</option>
            <option value="customer">לקוח</option>
            <option value="team">צוות</option>
          </select>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            🔄 רענן
          </button>
        </div>

        <div className="perm-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 520, overflowY: "auto" }}>
            <div className="lotto-panel-title" style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              משתמשים ({users.length})
            </div>
            {loading && users.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>טוען…</div>
            ) : users.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>לא נמצאו משתמשים</div>
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
                    background: selected?.id === u.id ? "var(--gold-bg)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: ".82rem" }}>{u.displayName}</div>
                  <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{u.email}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span className="badge badge-muted">{u.roleLabel}</span>
                    {u.isPremium && <span className="badge badge-gold">Premium</span>}
                    {!u.isActive && <span className="badge badge-red">לא פעיל</span>}
                    <span className="badge badge-gold">₪{(u.balanceIls ?? 0).toFixed(0)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            {!selected ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                בחר משתמש מהרשימה
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 900 }}>
                    {selected.displayName}
                  </div>
                  <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>{selected.email}</div>
                  {selected.phone && (
                    <div style={{ fontSize: ".72rem", color: "var(--text2)" }}>{selected.phone}</div>
                  )}
                </div>

                <div
                  className={selected.isPremium ? "tier-premium" : "lotto-panel"}
                  style={{ marginBottom: 14, padding: 12 }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {selected.isPremium ? "⭐ Premium פעיל" : "🔒 ללא Premium"}
                  </div>
                  {selected.premiumExpiresAt && (
                    <div style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: 8 }}>
                      עד: {new Date(selected.premiumExpiresAt).toLocaleDateString("he-IL")}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-gold btn-sm"
                      disabled={saving}
                      onClick={() => run(() => permissionsAdminService.grantPremium(selected.id, 30), "Premium הופעל ל-30 יום")}
                    >
                      ⭐ הפעל Premium (30 יום)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={saving || !selected.isPremium}
                      onClick={() => run(() => permissionsAdminService.revokePremium(selected.id), "Premium בוטל")}
                    >
                      בטל Premium
                    </button>
                  </div>
                </div>

                <div className="lotto-panel" style={{ marginBottom: 14, padding: 12 }}>
                  <div className="lotto-panel-title" style={{ marginBottom: 8 }}>💳 יתרת ארנק</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--gold)", marginBottom: 10 }}>
                    ₪{(selected.balanceIls ?? 0).toFixed(2)}
                  </div>
                  <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                    הוסף יתרה (₪)
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="לדוגמה: 100"
                    style={{ marginBottom: 8 }}
                  />
                  <input
                    className="input"
                    value={balanceNote}
                    onChange={(e) => setBalanceNote(e.target.value)}
                    placeholder="הערה (אופציונלי)"
                    style={{ marginBottom: 10 }}
                  />
                  {balanceAmount && !Number.isNaN(parseFloat(balanceAmount)) && (
                    <p style={{ fontSize: ".68rem", color: "var(--muted)", marginBottom: 10 }}>
                      יתרה לאחר הוספה: ₪
                      {(selected.balanceIls + parseFloat(balanceAmount.replace(",", "."))).toFixed(2)}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-gold btn-sm"
                    disabled={saving || !balanceAmount.trim() || parseFloat(balanceAmount) <= 0}
                    onClick={async () => {
                      const amount = parseFloat(balanceAmount.replace(",", "."));
                      if (Number.isNaN(amount) || amount <= 0) return;
                      setSaving(true);
                      setError("");
                      setMessage("");
                      try {
                        const res = await balanceAdminService.adjustBalance(
                          selected.id,
                          amount,
                          balanceNote.trim() || undefined,
                        );
                        const updated = { ...selected, balanceIls: res.user.balanceIls };
                        setSelected(updated);
                        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                        setBalanceAmount("");
                        setBalanceNote("");
                        setMessage(`נוספו ₪${amount.toFixed(2)} — יתרה: ₪${res.user.balanceIls.toFixed(2)}`);
                      } catch (e) {
                        setError(extractApiError(e, "שגיאה בעדכון יתרה"));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    הוסף יתרה
                  </button>
                </div>

                {isAdmin && (
                  <div className="lotto-panel" style={{ marginBottom: 14 }}>
                    <div className="lotto-panel-title" style={{ marginBottom: 8 }}>תפקיד באתר</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${selected.role === "customer" ? "btn-gold" : "btn-outline"}`}
                        disabled={saving}
                        onClick={() => run(() => permissionsAdminService.setRole(selected.id, "customer"), "הוגדר כלקוח")}
                      >
                        👤 לקוח
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selected.role === "team" ? "btn-gold" : "btn-outline"}`}
                        disabled={saving}
                        onClick={() => run(() => permissionsAdminService.setRole(selected.id, "team"), "הוגדר כצוות")}
                      >
                        🛡️ צוות האתר
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-green btn-sm"
                    disabled={saving}
                    onClick={() => run(() => permissionsAdminService.grantAll(selected.id), "כל ההרשאות הופעלו")}
                  >
                    ✅ הפעל הכל
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={saving}
                    onClick={() => run(() => permissionsAdminService.revokeAll(selected.id), "כל ההרשאות בוטלו")}
                  >
                    ✕ בטל הכל
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selected.isActive ? "btn-outline" : "btn-green"}`}
                    disabled={saving}
                    onClick={() =>
                      run(
                        () => permissionsAdminService.setActive(selected.id, !selected.isActive),
                        selected.isActive ? "המשתמש הושבת" : "המשתמש הופעל",
                      )
                    }
                  >
                    {selected.isActive ? "⏸ השבת" : "▶ הפעל"} משתמש
                  </button>
                </div>

                <div className="lotto-panel-title" style={{ marginBottom: 10 }}>הרשאות מפורטות</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selected.permissions.map((p) => (
                    <PermToggle
                      key={p.key}
                      perm={p}
                      disabled={saving}
                      onChange={(granted) =>
                        run(
                          () => permissionsAdminService.setPermission(selected.id, p.key, granted),
                          granted ? `${p.label} הופעל` : `${p.label} בוטל`,
                        )
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PermToggle({
  perm,
  disabled,
  onChange,
}: {
  perm: PermissionRow;
  disabled: boolean;
  onChange: (granted: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        background: perm.granted ? "var(--green-bg)" : "var(--bg3)",
        border: `1px solid ${perm.granted ? "#b0dfc0" : "var(--border)"}`,
        borderRadius: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--text)" }}>{perm.label}</div>
        <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 2 }}>{perm.hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={perm.granted}
        disabled={disabled}
        className={`perm-switch${perm.granted ? " on" : ""}`}
        onClick={() => onChange(!perm.granted)}
      >
        <span className="perm-switch-knob" />
      </button>
    </div>
  );
}
