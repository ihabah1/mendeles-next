"use client";

import { useState } from "react";
import { extractApiError } from "@/lib/api/client";
import {
  printQueueService,
  type PrintControlConfig,
} from "@/lib/api/print-queue";

type Props = {
  config: PrintControlConfig | null | undefined;
  onUpdated: () => void;
};

export default function PrintControlPanel({ config, onUpdated }: Props) {
  const [orderNumber, setOrderNumber] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [agentId, setAgentId] = useState("default");
  const [agentHost, setAgentHost] = useState("");
  const [agentReady, setAgentReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!config) return null;

  const run = async (fn: () => Promise<{ detail?: string }>, ok: string) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fn();
      setMessage(res.detail || ok);
      onUpdated();
    } catch (e) {
      setError(extractApiError(e, "פעולה נכשלה"));
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("הועתק ללוח");
    } catch {
      setError("לא ניתן להעתיק");
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: "16px 18px",
        borderColor: "var(--navy-b)",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontFamily: "'Frank Ruhl Libre',serif",
          fontSize: "1rem",
          fontWeight: 900,
          color: "var(--cream)",
        }}
      >
        ⚙️ שליטה בהדפסות
      </h2>

      {message && (
        <div style={{ color: "#1db96a", fontSize: ".8rem", marginBottom: 8 }}>{message}</div>
      )}
      {error && (
        <div style={{ color: "#ff6b7a", fontSize: ".8rem", marginBottom: 8 }}>{error}</div>
      )}

      <div className="admin-kv-grid" style={{ marginBottom: 14 }}>
        <div className="admin-kv">
          <div className="admin-kv-label">סוג הדפסה (ברירת מחדל)</div>
          <div className="admin-kv-value">
            {config.payloadModes.find((m) => m.value === config.payloadMode)?.label ||
              config.payloadMode}
          </div>
        </div>
        <div className="admin-kv">
          <div className="admin-kv-label">מפתח API בשרת</div>
          <div className="admin-kv-value">
            {config.apiKeyConfigured ? (
              <span style={{ color: "#1db96a" }}>מוגדר {config.apiKeyHint}</span>
            ) : (
              <span style={{ color: "#ff6b7a" }}>חסר PRINT_API_KEY</span>
            )}
          </div>
        </div>
        <div className="admin-kv">
          <div className="admin-kv-label">כניסה אוטומטית לתור</div>
          <div className="admin-kv-value">{config.autoEnqueue ? "פעיל" : "כבוי"}</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--cream)", marginBottom: 6 }}>
          הכנסה ידנית לתור
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="מספר הזמנה (MAND-...)"
            style={{ flex: 1, minWidth: 180, fontSize: ".8rem" }}
          />
          <button
            type="button"
            className="btn btn-gold btn-sm"
            disabled={busy || !orderNumber.trim()}
            onClick={() =>
              run(
                () => printQueueService.enqueueByOrderNumber(orderNumber.trim()),
                "נוסף לתור",
              )
            }
          >
            הוסף לתור
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--cream)", marginBottom: 6 }}>
          בדיקת מפתח API (לסוכן)
        </div>
        <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "0 0 8px" }}>
          הדבק את המפתח מ-<code>print_agent_config.json</code> כדי לוודא שהוא תואם ל-Railway.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="PRINT_API_KEY"
            style={{ flex: 1, minWidth: 180, fontSize: ".8rem" }}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy || !apiKey.trim()}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              setError("");
              try {
                const res = await printQueueService.verifyApiKey(apiKey.trim());
                if (res.valid) setMessage(res.detail);
                else setError(res.detail);
              } catch (e) {
                setError(extractApiError(e, "בדיקה נכשלה"));
              } finally {
                setBusy(false);
              }
            }}
          >
            בדוק מפתח
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--cream)", marginBottom: 6 }}>
          רישום ידני של סוכן
        </div>
        <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: "0 0 8px" }}>
          כשהסוכן לא שולח heartbeat — רשום אותו ידנית כדי לעדכן את הסטטוס בדשבורד.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <input
            className="input"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="agent_id"
            style={{ width: 120, fontSize: ".8rem" }}
          />
          <input
            className="input"
            value={agentHost}
            onChange={(e) => setAgentHost(e.target.value)}
            placeholder="שם מחשב (אופציונלי)"
            style={{ flex: 1, minWidth: 140, fontSize: ".8rem" }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".78rem", color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={agentReady}
              onChange={(e) => setAgentReady(e.target.checked)}
            />
            מדפסת מוכנה
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  printQueueService.registerAgent({
                    agentId: agentId.trim() || "default",
                    hostname: agentHost.trim() || undefined,
                    printerReady: agentReady,
                  }),
                "סוכן נרשם",
              )
            }
          >
            רשום סוכן
          </button>
        </div>
      </div>

      <details style={{ fontSize: ".72rem", color: "var(--muted)" }}>
        <summary style={{ cursor: "pointer", color: "var(--cream)", fontWeight: 700 }}>
          הגדרות סוכן (print_agent_config.json)
        </summary>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(config.agentEndpoints).map(([key, url]) => (
            <div key={key} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ minWidth: 72, fontWeight: 700 }}>{key}</span>
              <code style={{ fontSize: ".65rem", wordBreak: "break-all" }}>{url}</code>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: ".62rem", padding: "2px 8px" }}
                onClick={() => copyText(url)}
              >
                העתק
              </button>
            </div>
          ))}
          <pre
            style={{
              marginTop: 8,
              padding: 10,
              background: "rgba(0,0,0,.2)",
              borderRadius: 8,
              overflow: "auto",
              fontSize: ".65rem",
            }}
          >
            {JSON.stringify(config.configFileExample, null, 2)}
          </pre>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              copyText(JSON.stringify(config.configFileExample, null, 2))
            }
          >
            העתק קובץ דוגמה
          </button>
        </div>
      </details>
    </div>
  );
}
