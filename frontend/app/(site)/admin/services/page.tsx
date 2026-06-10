"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import { serviceFlagsApi, type ServiceFlag } from "@/lib/api/serviceFlags";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";

export default function AdminServicesPage() {
  return (
    <ProtectedRoute adminOnly>
      <AdminServicesInner />
    </ProtectedRoute>
  );
}

function AdminServicesInner() {
  const backendOrigin = useBackendOrigin();
  const manageBaseUrl = `${backendOrigin}/manage/`;
  const [flags, setFlags] = useState<ServiceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFlags(await serviceFlagsApi.list());
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (flag: ServiceFlag) => {
    setSaving(flag.key);
    setError("");
    setMessage("");
    try {
      const updated = await serviceFlagsApi.update({ [flag.key]: !flag.enabled });
      setFlags(updated);
      const next = updated.find((f) => f.key === flag.key);
      if (next?.requires_restart && next.enabled !== flag.enabled) {
        setMessage("השינוי נשמר. ייתכן שיידרש restart לשרת Django.");
      } else {
        setMessage("השינוי נשמר.");
      }
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 14px 60px" }}>
        <AdminNavTabs active="services" />
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.35rem", color: "var(--cream)", margin: "0 0 8px" }}>
          ⚙️ ניהול שירותים
        </h1>
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 20 }}>
          הפעלה וכיבוי של מודולים במערכת. שינויים נשמרים מיד; חלק מהדגלים דורשים הפעלה מחדש של השרת.
        </p>

        {error && (
          <div style={{ background: "rgba(255,80,80,.12)", border: "1px solid rgba(255,80,80,.35)", color: "#ff8a8a", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: ".78rem" }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ background: "rgba(29,185,106,.12)", border: "1px solid rgba(29,185,106,.35)", color: "#6ee7a0", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: ".78rem" }}>
            {message}
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)" }}>טוען...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {flags.map((flag) => (
              <div
                key={flag.key}
                style={{
                  background: "rgba(26,45,66,.85)",
                  border: "1px solid var(--navy-b)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--cream)", fontSize: ".88rem" }}>{flag.label}</div>
                  <div style={{ color: "var(--muted)", fontSize: ".72rem", marginTop: 4 }}>{flag.description}</div>
                  {flag.requires_restart && (
                    <div style={{ color: "#e8c870", fontSize: ".65rem", marginTop: 4 }}>⚠️ שינוי עשוי לדרוש restart</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving === flag.key}
                  onClick={() => toggle(flag)}
                  style={{
                    flexShrink: 0,
                    minWidth: 72,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${flag.enabled ? "var(--green)" : "var(--navy-b)"}`,
                    background: flag.enabled ? "rgba(29,185,106,.15)" : "rgba(255,80,80,.08)",
                    color: flag.enabled ? "#6ee7a0" : "#ff8a8a",
                    fontWeight: 800,
                    fontSize: ".72rem",
                    cursor: saving === flag.key ? "wait" : "pointer",
                  }}
                >
                  {saving === flag.key ? "..." : flag.enabled ? "פעיל" : "כבוי"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--navy-b)" }}>
          <h2 style={{ fontSize: ".9rem", color: "var(--cream)", marginBottom: 10 }}>קישורים מהירים</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a href={manageBaseUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
              דשבורד Django /manage ↗
            </a>
            <a href={manageBaseUrl + "ai/"} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
              בקשות AI ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
