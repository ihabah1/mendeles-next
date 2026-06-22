"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminLoading,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
} from "@/components/admin/AdminUI";
import { extractApiError } from "@/lib/api/client";
import {
  kiosksAdminService,
  type KioskRecord,
  type KioskSiteUser,
} from "@/lib/api/kiosks-admin";

export default function AdminKiosksPage() {
  return <KiosksPageInner />;
}

function KiosksPageInner() {
  const [kiosks, setKiosks] = useState<KioskRecord[]>([]);
  const [siteUsers, setSiteUsers] = useState<KioskSiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerTable, setPricePerTable] = useState("3");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [kioskRes, usersRes] = await Promise.all([
        kiosksAdminService.list(),
        kiosksAdminService.listSiteUsers(),
      ]);
      setKiosks(kioskRes.kiosks);
      setSiteUsers(usersRes.users);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינה"));
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
    const price = parseFloat(pricePerTable.replace(",", "."));
    if (Number.isNaN(price) || price < 0) {
      setError("מחיר לטבלה לא תקין");
      setSaving(false);
      return;
    }
    try {
      const res = await kiosksAdminService.create({
        name: name.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        location: location.trim(),
        phone: phone.trim(),
        pricePerTable: price,
      });
      setKiosks((prev) => [...prev, res.kiosk].sort((a, b) => a.name.localeCompare(b.name, "he")));
      setName("");
      setOwnerName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setLocation("");
      setPricePerTable("3");
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
      const res = await kiosksAdminService.update(kiosk.id, { isActive: !kiosk.isActive });
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

  const copyApiKey = async (kiosk: KioskRecord) => {
    if (!kiosk.apiKey) {
      setError("מפתח לא זמין — רענן את הדף או התחבר שוב מתוכנת הדוכן.");
      return;
    }
    try {
      await navigator.clipboard.writeText(kiosk.apiKey);
      setCopiedId(kiosk.id);
      setMessage(`מפתח API של ${kiosk.name} הועתק.`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("לא ניתן להעתיק — העתק ידנית מהשדה.");
    }
  };

  return (
    <>
      <AdminShell maxWidth={980}>
        <AdminPageHeader
          title="דוכנים (קיוסק)"
          description="יצירת משתמשי תוכנת הדפסה. בעל הדוכן מתחבר ב-POST /api/kiosk/login עם אימייל+סיסמה ומקבל apiKey."
          actions={<AdminRefreshButton onClick={load} loading={loading} />}
        />

        {error && <AdminAlert type="error">{error}</AdminAlert>}
        {message && <AdminAlert type="success">{message}</AdminAlert>}

        <section style={panelStyle}>
          <h2 style={sectionTitle}>דוכן חדש</h2>
          <form onSubmit={createKiosk} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="שם דוכן" value={name} onChange={setName} required />
              <Field label="שם בעלים" value={ownerName} onChange={setOwnerName} />
              <Field label="מיקום" value={location} onChange={setLocation} placeholder="עיר / כתובת" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <Field label="אימייל (התחברות)" value={email} onChange={setEmail} type="email" required />
              <Field label="טלפון" value={phone} onChange={setPhone} />
              <Field label="סיסמה" value={password} onChange={setPassword} type="password" required minLength={6} />
              <Field label="מחיר לטבלה ₪" value={pricePerTable} onChange={setPricePerTable} />
            </div>
            <div>
              <button type="submit" disabled={saving} style={primaryBtnStyle}>
                {saving ? "יוצר…" : "צור דוכן"}
              </button>
            </div>
          </form>
        </section>

        <section style={{ ...panelStyle, marginBottom: 20 }}>
          <h2 style={sectionTitle}>משתמשי קיוסק ({kiosks.length})</h2>
          <p style={{ color: "var(--muted)", fontSize: ".72rem", margin: "0 0 12px" }}>
            חשבונות להתחברות מתוכנת ההדפסה · התחברות: POST /django-api/kiosk/login/ (אימייל+סיסמה → apiKey)
          </p>

          {loading ? (
            <AdminLoading />
          ) : kiosks.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>אין דוכנים עדיין.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["דוכן", "בעלים", "אימייל", "טלפון", "מיקום", "₪/טבלה", "מפתח", "התחברות", "סטטוס", ""].map(
                      (h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {kiosks.map((kiosk) => (
                    <tr key={kiosk.id} style={{ opacity: kiosk.isActive ? 1 : 0.6 }}>
                      <td style={tdStyle}>{kiosk.name}</td>
                      <td style={tdStyle}>{kiosk.ownerName || "—"}</td>
                      <td style={tdStyle}>{kiosk.email}</td>
                      <td style={tdStyle}>{kiosk.phone || "—"}</td>
                      <td style={tdStyle}>{kiosk.location || "—"}</td>
                      <td style={tdStyle}>₪{kiosk.pricePerTable.toFixed(2)}</td>
                      <td style={tdStyle}>
                        {kiosk.apiKey ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
                            <code style={keyStyle} title={kiosk.apiKey}>
                              {kiosk.apiKey}
                            </code>
                            <button type="button" onClick={() => copyApiKey(kiosk)} style={copyBtnStyle}>
                              {copiedId === kiosk.id ? "הועתק ✓" : "העתק מפתח"}
                            </button>
                          </div>
                        ) : (
                          kiosk.apiKeyHint ?? "—"
                        )}
                      </td>
                      <td style={tdStyle}>{formatDate(kiosk.lastLoginAt)}</td>
                      <td style={tdStyle}>
                        <span style={{ color: kiosk.isActive ? "var(--green)" : "#e87070" }}>
                          {kiosk.isActive ? "פעיל" : "מושבת"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          disabled={togglingId === kiosk.id}
                          onClick={() => toggleKiosk(kiosk)}
                          style={toggleBtn(kiosk.isActive)}
                        >
                          {togglingId === kiosk.id ? "…" : kiosk.isActive ? "השבת" : "הפעל"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>לקוחות האתר ({siteUsers.length})</h2>
          <p style={{ color: "var(--muted)", fontSize: ".72rem", margin: "0 0 12px" }}>
            משתמשים רשומים באתר — לידיעה בלבד (לא חשבונות קיוסק)
          </p>
          {loading ? (
            <AdminLoading />
          ) : siteUsers.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>אין לקוחות.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["שם", "אימייל", "טלפון", "תפקיד", "הצטרף"].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {siteUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>{u.displayName || "—"}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{u.phone || "—"}</td>
                      <td style={tdStyle}>{u.role}</td>
                      <td style={tdStyle}>{formatDate(u.dateJoined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminShell>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".75rem" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <input
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : "off"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  background: "rgba(26,45,66,.85)",
  border: "1px solid var(--navy-b)",
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: ".95rem",
  color: "var(--cream)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: ".75rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 10px",
  borderBottom: "1px solid var(--navy-b)",
  color: "var(--muted)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid rgba(255,255,255,.06)",
  color: "var(--cream)",
  verticalAlign: "middle",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--navy-b)",
  background: "rgba(0,0,0,.25)",
  color: "var(--cream)",
  fontSize: ".82rem",
};

const keyStyle: React.CSSProperties = {
  fontSize: ".65rem",
  wordBreak: "break-all",
  color: "var(--gold)",
  background: "rgba(0,0,0,.3)",
  padding: "4px 6px",
  borderRadius: 4,
  lineHeight: 1.35,
};

const copyBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid var(--navy-b)",
  background: "rgba(255,255,255,.06)",
  color: "var(--cream)",
  fontSize: ".68rem",
  cursor: "pointer",
  alignSelf: "flex-start",
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

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: ".72rem",
    background: active ? "rgba(232,112,112,.2)" : "rgba(112,232,160,.2)",
    color: active ? "#e87070" : "#70e8a0",
  };
}
