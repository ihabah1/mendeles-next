"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAlert, AdminLoading } from "@/components/admin/AdminUI";
import { extractApiError } from "@/lib/api/client";
import {
  whatsappAdminApi,
  type WhatsAppSetup,
  type WhatsAppStatus,
} from "@/lib/api/whatsapp-admin";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: ".68rem",
        fontWeight: 700,
        background: ok ? "rgba(29,185,106,.15)" : "rgba(255,80,80,.1)",
        color: ok ? "#6ee7a0" : "#ff8a8a",
        border: `1px solid ${ok ? "rgba(29,185,106,.35)" : "rgba(255,80,80,.3)"}`,
      }}
    >
      {label}
    </span>
  );
}

export default function WhatsAppAgentPanel() {
  const [setup, setSetup] = useState<WhatsAppSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testMsg, setTestMsg] = useState("שלום, מה הסטטוס של המסמכים שלי?");
  const [testFrom, setTestFrom] = useState("whatsapp:+972501234567");
  const [testReply, setTestReply] = useState("");
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSetup(await whatsappAdminApi.setup());
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyWebhook = async () => {
    if (!setup?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(setup.webhookUrl);
      setMessage("כתובת Webhook הועתקה");
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setError("לא הצלחנו להעתיק — העתק ידנית");
    }
  };

  const runSimulate = async () => {
    setSimulating(true);
    setError("");
    setTestReply("");
    try {
      const res = await whatsappAdminApi.simulate({
        message: testMsg,
        from: testFrom || undefined,
      });
      setTestReply(res.reply);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setSimulating(false);
    }
  };

  const st: WhatsAppStatus | null = setup?.status ?? null;

  return (
    <section
      style={{
        marginTop: 28,
        paddingTop: 20,
        borderTop: "1px solid var(--navy-b)",
      }}
      aria-labelledby="whatsapp-agent-heading"
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            id="whatsapp-agent-heading"
            style={{ fontSize: ".95rem", color: "var(--cream)", marginBottom: 6 }}
          >
            💬 סוכן WhatsApp
          </h2>
          <p style={{ fontSize: ".72rem", color: "var(--muted)", maxWidth: 520 }}>
            מענה אוטומטי ללקוחות דרך Twilio — סטטוס מסמכים, הדרכה ליצירת הצעת מחיר, ותשובות AI
            (Gemini).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          style={{ fontSize: ".7rem" }}
          onClick={load}
          disabled={loading}
        >
          🔄 רענן
        </button>
      </div>

      {error && <AdminAlert type="error">{error}</AdminAlert>}
      {message && <AdminAlert type="success">{message}</AdminAlert>}

      {loading ? (
        <AdminLoading />
      ) : setup ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <StatusPill ok={!!st?.enabled} label={st?.enabled ? "מופעל" : "כבוי"} />
            <StatusPill ok={!!st?.configured} label={st?.configured ? "מוגדר" : "לא מוגדר"} />
            <StatusPill ok={!!st?.twilio} label={st?.twilio ? "Twilio מחובר" : "חסר Twilio"} />
            <StatusPill ok={!!st?.gemini} label={st?.gemini ? "Gemini פעיל" : "Gemini כבוי"} />
          </div>

          {st?.hint && (
            <p style={{ fontSize: ".72rem", color: "#94a3b8" }}>{st.hint}</p>
          )}

          {st?.whatsappFrom && (
            <p style={{ fontSize: ".72rem", color: "var(--muted)" }}>
              מספר שולח: <code>{st.whatsappFrom}</code>
            </p>
          )}

          <div
            style={{
              background: "rgba(26,45,66,.85)",
              border: "1px solid var(--navy-b)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: ".72rem", color: "var(--muted)", marginBottom: 6 }}>
              Webhook (POST ב-Twilio Console):
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <code
                style={{
                  fontSize: ".68rem",
                  wordBreak: "break-all",
                  color: "var(--cream)",
                  flex: 1,
                }}
              >
                {setup.webhookUrl}
              </code>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: ".68rem" }}
                onClick={copyWebhook}
              >
                העתק
              </button>
              <a
                href={setup.twilioConsole}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ fontSize: ".68rem" }}
              >
                Twilio Console ↗
              </a>
            </div>
            <ol
              style={{
                margin: "12px 0 0",
                paddingRight: 18,
                fontSize: ".7rem",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              {setup.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div
            style={{
              background: "rgba(26,45,66,.85)",
              border: "1px solid var(--navy-b)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <h3 style={{ fontSize: ".82rem", color: "var(--cream)", marginBottom: 10 }}>
              סימולציה (ללא Twilio)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label
                  htmlFor="wa-test-from"
                  style={{ fontSize: ".68rem", color: "var(--muted)", display: "block", marginBottom: 4 }}
                >
                  מספר שולח (לזיהוי משתמש):
                </label>
                <input
                  id="wa-test-from"
                  value={testFrom}
                  onChange={(e) => setTestFrom(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--navy)",
                    border: "1px solid var(--navy-b)",
                    borderRadius: 8,
                    color: "var(--cream)",
                    padding: "8px 12px",
                    fontFamily: "Heebo,sans-serif",
                    fontSize: ".78rem",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="wa-test-msg"
                  style={{ fontSize: ".68rem", color: "var(--muted)", display: "block", marginBottom: 4 }}
                >
                  הודעה נכנסת:
                </label>
                <textarea
                  id="wa-test-msg"
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    background: "var(--navy)",
                    border: "1px solid var(--navy-b)",
                    borderRadius: 8,
                    color: "var(--cream)",
                    padding: "8px 12px",
                    fontFamily: "Heebo,sans-serif",
                    fontSize: ".78rem",
                    resize: "vertical",
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-gold"
                style={{ alignSelf: "flex-start", fontSize: ".74rem" }}
                onClick={runSimulate}
                disabled={simulating || !testMsg.trim()}
              >
                {simulating ? "מעבד..." : "▶ הרץ סימולציה"}
              </button>
              {testReply && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "rgba(29,185,106,.08)",
                    border: "1px solid rgba(29,185,106,.25)",
                    fontSize: ".78rem",
                    color: "var(--cream)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <div style={{ fontSize: ".65rem", color: "var(--muted)", marginBottom: 6 }}>
                    תשובת הסוכן:
                  </div>
                  {testReply}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
