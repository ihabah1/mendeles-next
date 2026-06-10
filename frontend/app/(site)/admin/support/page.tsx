"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import { supportAdminService, type SupportRequest } from "@/lib/api/support-admin";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminSupportPage() {
  return (
    <ProtectedRoute adminOnly>
      <SupportPageInner />
    </ProtectedRoute>
  );
}

function SupportPageInner() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await supportAdminService.list(40);
      setRequests(items);
    } catch (err) {
      setError(extractApiError(err, "שגיאה בטעינה"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Nav />
      <div className="page-wrap" style={{ maxWidth: 960 }}>
        <AdminNavTabs active="support" />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "0 0 16px", color: "var(--cream)" }}>
          💬 בקשות נציג מהצ׳אט
        </h1>
        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 16, lineHeight: 1.6 }}>
          לקוחות שביקשו נציג אנושי דרך בלון העזרה באתר. נשלחת גם הודעה לתיבת הדואר של הצוות.
        </p>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            🔄 רענן
          </button>
        </div>

        {loading && !requests.length ? (
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>טוען…</p>
        ) : !requests.length ? (
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>אין בקשות עדיין.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map((req) => (
              <article key={req.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: "var(--text)", fontSize: ".88rem" }}>{req.customerName}</strong>
                  <time dateTime={req.createdAt} style={{ color: "var(--muted)", fontSize: ".72rem" }}>
                    {formatDate(req.createdAt)}
                  </time>
                </div>
                {(req.customerEmail || req.customerPhone) && (
                  <p style={{ margin: "0 0 8px", fontSize: ".76rem", color: "var(--text2)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {req.customerEmail && <span>{req.customerEmail}</span>}
                    {req.customerPhone && <span>{req.customerPhone}</span>}
                  </p>
                )}
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: ".72rem",
                    lineHeight: 1.55,
                    color: "var(--text2)",
                    fontFamily: "var(--font-body)",
                    background: "var(--bg3)",
                    padding: 10,
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {req.details}
                </pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
