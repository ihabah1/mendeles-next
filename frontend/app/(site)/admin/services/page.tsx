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
import { serviceFlagsApi, type ServiceFlag } from "@/lib/api/serviceFlags";
import WhatsAppAgentPanel from "@/components/admin/WhatsAppAgentPanel";
import { useBackendOrigin } from "@/hooks/useBackendOrigin";

export default function AdminServicesPage() {
  return <AdminServicesInner />;
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
      <AdminShell maxWidth={720}>
        <AdminPageHeader
          title="ניהול שירותים"
          description="הפעלה וכיבוי של מודולים במערכת. שינויים נשמרים מיד; חלק מהדגלים דורשים הפעלה מחדש של השרת."
          actions={<AdminRefreshButton onClick={load} loading={loading} />}
        />

        {error && <AdminAlert type="error">{error}</AdminAlert>}
        {message && <AdminAlert type="success">{message}</AdminAlert>}

        {loading ? (
          <AdminLoading />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {flags.map((flag) => (
              <div key={flag.key} className="admin-flag-row">
                <div style={{ flex: 1 }}>
                  <div className="admin-flag-title">{flag.label}</div>
                  <div className="admin-flag-desc">{flag.description}</div>
                  {flag.requires_restart && (
                    <div style={{ color: "#64748b", fontSize: ".65rem", marginTop: 4 }}>
                      ⚠️ שינוי עשוי לדרוש restart
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving === flag.key}
                  onClick={() => toggle(flag)}
                  aria-pressed={flag.enabled}
                  aria-label={`${flag.label} — ${flag.enabled ? "פעיל, לחץ לכיבוי" : "כבוי, לחץ להפעלה"}`}
                  className={`admin-flag-toggle${flag.enabled ? " admin-flag-toggle--on" : " admin-flag-toggle--off"}`}
                >
                  {saving === flag.key ? "..." : flag.enabled ? "פעיל" : "כבוי"}
                </button>
              </div>
            ))}
          </div>
        )}

        <WhatsAppAgentPanel />

        <div className="admin-section-divider">
          <h2 style={{ fontSize: ".9rem", marginBottom: 10 }}>קישורים מהירים</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a href={manageBaseUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
              דשבורד Django /manage ↗
            </a>
            <a href={manageBaseUrl + "ai/"} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: ".72rem" }}>
              בקשות AI ↗
            </a>
          </div>
        </div>
      </AdminShell>
    </>
  );
}
