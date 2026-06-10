"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import AdminNavTabs from "@/components/admin/AdminNavTabs";
import ProtectedRoute from "@/components/ProtectedRoute";
import { extractApiError } from "@/lib/api/client";
import {
  messagesAdminService,
  type AdminMessage,
  type AiTextField,
  type AiTextMode,
  type InboxChannel,
  type MessagesUser,
} from "@/lib/api/messages-admin";

const CHANNEL_OPTIONS: { value: InboxChannel; label: string }[] = [
  { value: "system", label: "מערכת (תיבת דואר באתר)" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "אימייל" },
  { value: "push", label: "התראה" },
];

const AI_ACTIONS: { mode: AiTextMode; field: AiTextField; label: string }[] = [
  { mode: "polish", field: "both", label: "✨ שפר ניסוח" },
  { mode: "fix_grammar", field: "both", label: "✏️ תקן דקדוק" },
  { mode: "shorten", field: "body", label: "📐 קצר" },
  { mode: "formal", field: "both", label: "🎩 פורמלי" },
  { mode: "expand", field: "body", label: "📝 הרחב" },
  { mode: "subject", field: "subject", label: "💡 נושא אוטומטי" },
];

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

export default function AdminMessagesPage() {
  return (
    <ProtectedRoute adminOnly>
      <MessagesPageInner />
    </ProtectedRoute>
  );
}

function MessagesPageInner() {
  const [users, setUsers] = useState<MessagesUser[]>([]);
  const [selected, setSelected] = useState<MessagesUser | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [aiNotice, setAiNotice] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<InboxChannel>("system");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await messagesAdminService.listUsers({
        q: q.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.users);
      setSelected((prev) => {
        if (!prev) return null;
        return res.users.find((u) => u.id === prev.id) ?? prev;
      });
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת משתמשים"));
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);

  const loadUserDetail = useCallback(async (userId: number) => {
    setLoadingDetail(true);
    setError("");
    try {
      const res = await messagesAdminService.getUser(userId);
      setSelected(res.user);
      setMessages(res.messages);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בטעינת הודעות"));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const selectUser = (user: MessagesUser) => {
    setSelected(user);
    setSubject("");
    setBody("");
    setChannel("system");
    setAiNotice("");
    setMessage("");
    loadUserDetail(user.id);
  };

  const runAi = async (mode: AiTextMode, field: AiTextField) => {
    if (!body.trim() && field !== "subject") {
      setError("כתוב תוכן לפני שיפור ב-AI");
      return;
    }
    setAiLoading(true);
    setError("");
    setAiNotice("");
    try {
      const res = await messagesAdminService.aiTextFix({
        subject,
        body,
        mode,
        field,
      });
      if (field === "subject" || field === "both") setSubject(res.subject);
      if (field === "body" || field === "both") setBody(res.body);
      const src = res.source === "gemini" ? "Gemini" : "מקומי";
      setAiNotice(
        res.notice
          ? `${res.notice} (${src})`
          : `טקסט עודכן בעזרת ${src}`,
      );
    } catch (e) {
      setError(extractApiError(e, "שגיאה בשיפור טקסט"));
    } finally {
      setAiLoading(false);
    }
  };

  const send = async () => {
    if (!selected) return;
    if (!subject.trim() || !body.trim()) {
      setError("נושא ותוכן נדרשים");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await messagesAdminService.sendMessage(selected.id, {
        subject: subject.trim(),
        body: body.trim(),
        channel,
      });
      setSelected(res.user);
      setUsers((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
      setMessages((prev) => [res.message, ...prev]);
      setSubject("");
      setBody("");
      setMessage(res.detail);
    } catch (e) {
      setError(extractApiError(e, "שגיאה בשליחת הודעה"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="page-wrap" style={{ maxWidth: 1100 }}>
        <AdminNavTabs active="messages" />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "0 0 16px", color: "var(--cream)" }}>
          📬 ניהול מכתבים ללקוחות
        </h1>

        <p style={{ color: "var(--text2)", fontSize: ".82rem", marginBottom: 16, lineHeight: 1.6 }}>
          שליחת מכתבי מערכת לתיבת הדואר של הלקוח באתר, עם שיפור טקסט בעזרת AI.
        </p>

        {error && <div className="result-fail" style={{ marginBottom: 12 }}>{error}</div>}
        {message && <div className="result-pass" style={{ marginBottom: 12 }}>{message}</div>}
        {aiNotice && (
          <div className="result-pass" style={{ marginBottom: 12, opacity: 0.9 }}>
            {aiNotice}
          </div>
        )}

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
          <button type="button" className="btn btn-outline btn-sm" onClick={loadUsers} disabled={loading}>
            🔄 רענן
          </button>
        </div>

        <div
          className="perm-grid"
          style={{ display: "grid", gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.2fr)", gap: 14 }}
        >
          <div className="card" style={{ padding: 0, overflow: "hidden", maxHeight: 560, overflowY: "auto" }}>
            {loading && !users.length ? (
              <p style={{ padding: 16, color: "var(--muted)", fontSize: ".8rem" }}>טוען…</p>
            ) : !users.length ? (
              <p style={{ padding: 16, color: "var(--muted)", fontSize: ".8rem" }}>לא נמצאו משתמשים</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u)}
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
                  <div style={{ fontSize: ".68rem", color: "var(--text2)", marginTop: 4 }}>
                    {u.messageCount} הודעות
                    {u.unreadCount > 0 && (
                      <span style={{ color: "var(--red)", fontWeight: 700, marginInlineStart: 6 }}>
                        · {u.unreadCount} לא נקראו
                      </span>
                    )}
                  </div>
                  {u.lastSubject && (
                    <div style={{ fontSize: ".64rem", color: "var(--muted)", marginTop: 2 }}>
                      אחרון: {u.lastSubject}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 16, flex: "1 1 auto", maxHeight: 280, overflowY: "auto" }}>
              {!selected ? (
                <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>בחר לקוח מהרשימה</p>
              ) : loadingDetail ? (
                <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>טוען הודעות…</p>
              ) : messages.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>
                  אין הודעות ל-{selected.displayName || selected.email}
                </p>
              ) : (
                <>
                  <h2 style={{ fontSize: ".9rem", margin: "0 0 10px", color: "var(--cream)" }}>
                    היסטוריית הודעות ({messages.length})
                  </h2>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: ".78rem", color: "var(--cream)" }}>{m.subject}</strong>
                        <span style={{ fontSize: ".62rem", color: "var(--muted)" }}>{formatDate(m.sentAt)}</span>
                      </div>
                      <div style={{ fontSize: ".62rem", color: "var(--gold-dark)", margin: "2px 0 4px" }}>
                        {m.channelLabel}
                        {!m.isRead && (
                          <span style={{ color: "var(--red)", marginInlineStart: 6 }}>לא נקרא</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: ".72rem",
                          color: "var(--text2)",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.45,
                        }}
                      >
                        {m.body.length > 180 ? `${m.body.slice(0, 177)}…` : m.body}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="card" style={{ padding: 16 }}>
              {!selected ? (
                <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>בחר לקוח כדי לכתוב מכתב</p>
              ) : (
                <>
                  <h2 style={{ fontSize: ".95rem", margin: "0 0 12px", color: "var(--cream)" }}>
                    מכתב חדש — {selected.displayName || selected.email}
                  </h2>

                  <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                    ערוץ
                  </label>
                  <select
                    className="input"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as InboxChannel)}
                    style={{ marginBottom: 10 }}
                  >
                    {CHANNEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                    נושא
                  </label>
                  <input
                    className="input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="לדוגמה: ברוכים הבאים"
                    style={{ marginBottom: 10 }}
                  />

                  <label style={{ display: "block", fontSize: ".72rem", color: "var(--text2)", marginBottom: 6 }}>
                    תוכן
                  </label>
                  <textarea
                    className="input"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="כתוב את המכתב כאן…"
                    rows={5}
                    style={{ marginBottom: 10, resize: "vertical" }}
                  />

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {AI_ACTIONS.map((action) => (
                      <button
                        key={`${action.mode}-${action.field}`}
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => runAi(action.mode, action.field)}
                        disabled={aiLoading}
                      >
                        {aiLoading ? "…" : action.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={send}
                    disabled={saving || !subject.trim() || !body.trim()}
                    style={{ width: "100%" }}
                  >
                    {saving ? "שולח…" : "📤 שלח לתיבת הדואר"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
