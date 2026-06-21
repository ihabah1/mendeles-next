"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import {
  AdminAlert,
  AdminLoading,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
} from "@/components/admin/AdminUI";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import { kiosksAdminService, type KioskRecord } from "@/lib/api/kiosks-admin";

export default function AdminKiosksPage() {
  return (
    <ProtectedRoute adminOnly>
      <KiosksPageInner />
    </ProtectedRoute>
  );
}

function KiosksPageInner() {
  const [kiosks, setKiosks] = useState<KioskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await kiosksAdminService.list();
      setKiosks(res.kiosks);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת דוכנים"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await kiosksAdminService.create({
        name: name.trim(),
        email: email.trim(),
        password,
        location: location.trim(),
      });
      setKiosks((prev) => [...prev, res.kiosk].sort((a, b) => a.name.localeCompare(b.name, "he")));
      setName("");
      setEmail("");
      setPassword("");
      setLocation("");
      setMessage(res.detail);
    } catch (err) {
      setError(extractApiError(err, "שגיאה ביצירת דוכן"));
    } finally {
      setSaving(false);
    }
  };

  const toggleKiosk = async (kiosk: KioskRecord) => {
    setTogglingId(kiosk.id);
    setError("");
    setMessage("");
    try {
      const res = await kiosksAdminService.toggle(kiosk.id, !kiosk.isActive);
      setKiosks((prev) => prev.map((k) => (k.id === res.kiosk.id ? res.kiosk : k)));
      setMessage(res.detail);
    } catch (err) {
      setError(extractApiError(err, "שגיאה בעדכון סטטוס"));
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("he-IL");
    } catch {
      return iso;
    }
  };

  return (
    <>
      <Nav />
      <AdminShell maxWidth={900}>
        <AdminNavTabs active="kiosks" />
        <AdminPageHeader
          title="דוכנים"
          description="יצירת דוכנים לתוכנת הקiosk. בעל הדוכן מתחבר בתוכנה עם אימייל וסיסמה — ומקבל מפתח API."
          actions={<AdminRefreshButton onClick={load} loading={loading} />}
        />

        {error && <AdminAlert type="error">{error}</AdminAlert>}
        {message && <AdminAlert type="success">{message}</AdminAlert>}

        <section
          style={{
            background: "rgba(26,45,66,.85)",
            border: "1px solid var(--navy-b)",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: ".95rem", color: "var(--cream)" }}>
            דוכן חדש
          </h2>
          <form onSubmit={createKiosk} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".75rem" }}>
                <span style={{ color: "var(--muted)" }}>שם דוכן</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".75rem" }}>
                <span style={{ color: "var(--muted)" }}>מיקום</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="עיר / כתובת"
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".75rem" }}>
                <span style={{ color: "var(--muted)" }}>אימייל (התחברות בתוכנה)</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".75rem" }}>
                <span style={{ color: "var(--muted)" }}>סיסמה (לפחות 6 תווים)</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div>
              <button type="submit" disabled={saving} style={primaryBtnStyle}>
                {saving ? "יוצר…" : "צור דוכן"}
              </button>
            </div>
          </form>
        </section>

        {loading ? (
          <AdminLoading />
        ) : kiosks.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>אין דוכנים עדיין.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {kiosks.map((kiosk) => (
              <div
                key={kiosk.id}
                style={{
                  background: "rgba(26,45,66,.85)",
                  border: "1px solid var(--navy-b)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  opacity: kiosk.isActive ? 1 : 0.65,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--cream)", fontSize: ".88rem" }}>
                    {kiosk.name}
                    {!kiosk.isActive && (
                      <span style={{ color: "#e87070", fontWeight: 500, marginInlineStart: 8 }}>
                        (מושבת)
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: ".72rem", marginTop: 4 }}>
                    {kiosk.email}
                    {kiosk.location ? ` · ${kiosk.location}` : ""}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: ".68rem", marginTop: 4 }}>
                    מפתח API: {kiosk.apiKeyHint ?? "—"} · התחברות אחרונה: {formatDate(kiosk.lastLoginAt)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={togglingId === kiosk.id}
                  onClick={() => toggleKiosk(kiosk)}
                  aria-pressed={kiosk.isActive}
                  style={{
                    flexShrink: 0,
                    minWidth: 88,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: togglingId === kiosk.id ? "wait" : "pointer",
                    fontWeight: 700,
                    fontSize: ".75rem",
                    background: kiosk.isActive ? "rgba(232,112,112,.2)" : "rgba(112,232,160,.2)",
                    color: kiosk.isActive ? "#e87070" : "#70e8a0",
                  }}
                >
                  {togglingId === kiosk.id ? "…" : kiosk.isActive ? "השבת" : "הפעל"}
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminShell>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--navy-b)",
  background: "rgba(0,0,0,.25)",
  color: "var(--cream)",
  fontSize: ".82rem",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  background: "var(--gold)",
  color: "var(--navy)",
  fontWeight: 700,
  fontSize: ".82rem",
  cursor: "pointer",
};
