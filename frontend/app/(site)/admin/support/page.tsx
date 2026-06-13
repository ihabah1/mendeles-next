"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import {
  AdminAlert,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  AdminTabBar,
  AdminTabPanel,
} from "@/components/admin/AdminUI";
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
  const [search, setSearch] = useState("");

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

  const q = search.trim().toLowerCase();
  const filteredInquiries = useMemo(() => {
    if (!q) return inquiries;
    return inquiries.filter((inq) => {
      const blob = [
        inq.customerName,
        inq.customerEmail,
        inq.customerPhone,
        inq.aiSummary,
        inq.pagePath,
        ...inq.messages.map((m) => m.text),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [inquiries, q]);

  const filteredEscalations = useMemo(() => {
    if (!q) return escalations;
    return escalations.filter((req) => {
      const blob = [req.customerName, req.customerEmail, req.customerPhone, req.details]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [escalations, q]);

  return (
    <>
      <Nav />
      <AdminShell maxWidth={960}>
        <AdminNavTabs active="support" />
        <AdminPageHeader
          title="פניות צ׳אט"
          description="כל שיחות בלון העזרה נשמרות עם פרטי משתמש, זמן, מלל מלא וסיכום AI. בקשות לנציג אנושי מסומנות בנפרד."
          actions={<AdminRefreshButton onClick={load} loading={loading} />}
        />

        {error && <AdminAlert type="error">{error}</AdminAlert>}

        <AdminTabBar
          ariaLabel="סוג פניות"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "chat", label: "כל הפניות", count: inquiries.length },
            { id: "escalations", label: "בקשות נציג", count: escalations.length },
          ]}
        />

        <label className="sr-only" htmlFor="support-search">
          חיפוש בפניות
        </label>
        <input
          id="support-search"
          className="input"
          type="search"
          placeholder="חיפוש לפי שם, אימייל, טלפון או תוכן שיחה…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 14, fontSize: ".82rem" }}
          autoComplete="off"
        />

        {loading && !inquiries.length && !escalations.length ? (
          <AdminLoading label="טוען פניות…" />
        ) : (
          <>
            <AdminTabPanel tabId="chat" activeTab={tab}>
              {filteredInquiries.length === 0 ? (
                <AdminEmpty
                  title={q ? "לא נמצאו פניות לחיפוש זה" : "אין פניות עדיין"}
                  hint={q ? "נסה מילות חיפוש אחרות" : "פניות יופיעו כשמשתמשים ישוחחו עם הבוט"}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredInquiries.map((inq) => (
                    <ChatInquiryCard key={inq.id} inquiry={inq} />
                  ))}
                </div>
              )}
            </AdminTabPanel>

            <AdminTabPanel tabId="escalations" activeTab={tab}>
              {filteredEscalations.length === 0 ? (
                <AdminEmpty
                  title={q ? "לא נמצאו בקשות נציג" : "אין בקשות נציג עדיין"}
                  hint="בקשות יופיעו כשמשתמש יבקש נציג אנושי בצ׳אט"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredEscalations.map((req) => (
                    <EscalationCard key={req.id} request={req} />
                  ))}
                </div>
              )}
            </AdminTabPanel>
          </>
        )}
      </AdminShell>
    </>
  );
}

function ChatInquiryCard({ inquiry }: { inquiry: ChatInquiry }) {
  const contact = [inquiry.customerEmail, inquiry.customerPhone].filter(Boolean).join(" · ");
  const lastUserMsg = [...inquiry.messages].reverse().find((m) => m.role === "user")?.text;

  return (
    <details className="card admin-chat-card" open={inquiry.escalated}>
      <summary>
        <div className="admin-chat-summary-row">
          <div>
            <strong style={{ color: "var(--cream)", fontSize: ".9rem" }}>{inquiry.customerName}</strong>
            {inquiry.escalated && (
              <span className="badge badge-gold" style={{ marginInlineStart: 8, fontSize: ".62rem" }}>
                ביקש נציג
              </span>
            )}
            {contact && (
              <div style={{ fontSize: ".72rem", color: "var(--text2)", marginTop: 4 }}>{contact}</div>
            )}
            {lastUserMsg && (
              <div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: 6, lineHeight: 1.45 }}>
                {lastUserMsg.length > 120 ? `${lastUserMsg.slice(0, 120)}…` : lastUserMsg}
              </div>
            )}
          </div>
          <time dateTime={inquiry.updatedAt} style={{ color: "var(--muted)", fontSize: ".72rem", flexShrink: 0 }}>
            {formatDate(inquiry.updatedAt)}
          </time>
        </div>
      </summary>

      <div className="admin-chat-body">
        <p style={{ margin: "0 0 10px", fontSize: ".74rem", color: "var(--text2)" }}>
          {inquiry.pagePath ? `דף: ${inquiry.pagePath}` : ""}
          {inquiry.sessionId ? ` · מזהה שיחה: ${inquiry.sessionId}` : ""}
        </p>

        <div className="admin-chat-summary-box" role="note" aria-label="סיכום AI">
          <span style={{ fontWeight: 800 }}>סיכום AI: </span>
          {inquiry.aiSummary || "אין סיכום"}
        </div>

        <div className="admin-msg-list" aria-label="הודעות בשיחה">
          {inquiry.messages.map((m, i) => (
            <div
              key={i}
              className={`admin-msg${m.role === "user" ? " admin-msg--user" : " admin-msg--bot"}`}
            >
              <div className="admin-msg-role">
                {m.role === "user" ? "לקוח" : "בוט"}
                {m.at ? ` · ${formatDate(m.at)}` : ""}
              </div>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function EscalationCard({ request }: { request: SupportRequest }) {
  return (
    <article className="card" style={{ padding: 14, borderColor: "rgba(255,179,71,.35)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <strong style={{ color: "var(--text)", fontSize: ".88rem" }}>{request.customerName}</strong>
        <time dateTime={request.createdAt} style={{ color: "var(--muted)", fontSize: ".72rem" }}>
          {formatDate(request.createdAt)}
        </time>
      </div>
      {(request.customerEmail || request.customerPhone) && (
        <p style={{ margin: "0 0 8px", fontSize: ".76rem", color: "var(--text2)" }}>
          {[request.customerEmail, request.customerPhone].filter(Boolean).join(" · ")}
        </p>
      )}
      <pre style={preStyle}>{request.details}</pre>
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
