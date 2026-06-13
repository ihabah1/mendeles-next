"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import { monitoringAdminService, type ChatInquiry } from "@/lib/api/monitoring-admin";
import { supportAdminService, type SupportRequest } from "@/lib/api/support-admin";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
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
  const [tab, setTab] = useState<"chat" | "escalations">("chat");
  const [inquiries, setInquiries] = useState<ChatInquiry[]>([]);
  const [escalations, setEscalations] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [chat, esc] = await Promise.all([
        monitoringAdminService.chatInquiries(50),
        supportAdminService.list(30),
      ]);
      setInquiries(chat);
      setEscalations(esc);
    } catch (err) {
      setError(extractApiError(err, "שגיאה בטעינה"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === "chat" ? inquiries : escalations;

  return (
    <>
      <Nav />
      <div className="page-wrap" style={{ maxWidth: 960 }}>
        <AdminNavTabs active="support" />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "0 0 16px", color: "var(--cream)" }}>
          💬 פניות צ׳אט
        </h1>
        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 16, lineHeight: 1.6 }}>
          כל שיחות בלון העזרה נשמרות עם פרטי משתמש, זמן וסיכום. בקשות נציג מסומנות בנפרד.
        </p>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === "chat" ? "btn-gold" : "btn-outline"}`}
            onClick={() => setTab("chat")}
          >
            כל הפניות ({inquiries.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === "escalations" ? "btn-gold" : "btn-outline"}`}
            onClick={() => setTab("escalations")}
          >
            בקשות נציג ({escalations.length})
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            🔄 רענן
          </button>
        </div>

        {loading && !list.length ? (
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>טוען…</p>
        ) : tab === "chat" && !inquiries.length ? (
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>אין פניות עדיין.</p>
        ) : tab === "escalations" && !escalations.length ? (
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>אין בקשות נציג עדיין.</p>
        ) : tab === "chat" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {inquiries.map((inq) => (
              <ChatInquiryCard key={inq.id} inquiry={inq} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {escalations.map((req) => (
              <article key={req.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: "var(--text)", fontSize: ".88rem" }}>{req.customerName}</strong>
                  <time dateTime={req.createdAt} style={{ color: "var(--muted)", fontSize: ".72rem" }}>
                    {formatDate(req.createdAt)}
                  </time>
                </div>
                {(req.customerEmail || req.customerPhone) && (
                  <p style={{ margin: "0 0 8px", fontSize: ".76rem", color: "var(--text2)" }}>
                    {[req.customerEmail, req.customerPhone].filter(Boolean).join(" · ")}
                  </p>
                )}
                <pre style={preStyle}>{req.details}</pre>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ChatInquiryCard({ inquiry }: { inquiry: ChatInquiry }) {
  return (
    <article className="card" style={{ padding: 14, borderColor: inquiry.escalated ? "rgba(255,179,71,.4)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "var(--cream)", fontSize: ".9rem" }}>{inquiry.customerName}</strong>
          {inquiry.escalated && (
            <span className="badge badge-gold" style={{ marginRight: 8, fontSize: ".62rem" }}>ביקש נציג</span>
          )}
        </div>
        <time dateTime={inquiry.updatedAt} style={{ color: "var(--muted)", fontSize: ".72rem" }}>
          {formatDate(inquiry.updatedAt)}
        </time>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: ".74rem", color: "var(--text2)" }}>
        {[inquiry.customerEmail, inquiry.customerPhone].filter(Boolean).join(" · ")}
        {inquiry.pagePath ? ` · ${inquiry.pagePath}` : ""}
      </p>
      <div
        style={{
          background: "rgba(201,168,76,.1)",
          border: "1px solid rgba(201,168,76,.25)",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 10,
          fontSize: ".76rem",
          color: "var(--gold)",
          fontWeight: 600,
        }}
      >
        סיכום: {inquiry.aiSummary || "—"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {inquiry.messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              padding: "8px 10px",
              borderRadius: 8,
              background: m.role === "user" ? "var(--bg3)" : "rgba(29,185,106,.08)",
              border: "1px solid var(--border)",
              fontSize: ".72rem",
              color: "var(--text)",
            }}
          >
            <div style={{ fontSize: ".62rem", color: "var(--muted)", marginBottom: 4 }}>
              {m.role === "user" ? "לקוח" : "בוט"} {m.at ? `· ${formatDate(m.at)}` : ""}
            </div>
            {m.text}
          </div>
        ))}
      </div>
    </article>
  );
}

const preStyle: React.CSSProperties = {
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
};
