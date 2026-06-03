"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";
import { GOOGLE_OAUTH_ERRORS } from "@/lib/auth/google-oauth";

type Mode = "login" | "register" | "forgot" | "verify-pending";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/lotto";
  const { login, register, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean;
    backendReachable: boolean;
    hint: string | null;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect);
      return;
    }
    const oauthError = params.get("error");
    if (oauthError && GOOGLE_OAUTH_ERRORS[oauthError]) {
      setError(GOOGLE_OAUTH_ERRORS[oauthError]);
    }
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => setGoogleEnabled(Boolean(d.enabled)))
      .catch(() => setGoogleEnabled(false));

    fetch("/api/runtime-config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { configured?: boolean; backendReachable?: boolean; hint?: string | null } | null) => {
        if (!d) return;
        setApiStatus({
          configured: Boolean(d.configured),
          backendReachable: Boolean(d.backendReachable),
          hint: d.hint ?? null,
        });
      })
      .catch(() => setApiStatus({ configured: false, backendReachable: false, hint: null }));
  }, [params, isAuthenticated, router, redirect]);

  const go = (path: string) => { setError(""); setStatus(""); setMode(path as Mode); };

  const DEMO_EMAIL = "demo@mandeles.co.il";

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("יש למלא אימייל וסיסמה");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("הזן כתובת אימייל תקינה (לדוגמה: admin@admin.com)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(trimmedEmail, password);
      // סמן דמו אם זה חשבון הדמו
      if (user.email.toLowerCase() === DEMO_EMAIL) {
        document.cookie = "demo_mode=1; path=/; max-age=" + (30 * 86400);
      } else {
        document.cookie = "demo_mode=; path=/; max-age=0";
      }
      router.push(redirect);
    } catch (err) {
      setError(extractApiError(err, "אימייל או סיסמה שגויים"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("יש למלא אימייל וסיסמה");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await register({
        email: trimmedEmail,
        password,
        first_name: name,
        phone,
      });
      if (res.email_send_via === "frontend") {
        const sendRes = await fetch("/api/email/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: res.email }),
        });
        const sendData = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) {
          setError((sendData as { detail?: string }).detail || "שליחת אימייל האימות נכשלה");
          return;
        }
        setStatus((sendData as { detail?: string }).detail || res.detail);
      } else {
        setStatus(res.detail);
      }
      setPendingEmail(res.email);
      go("verify-pending");
    } catch (err) {
      setError(extractApiError(err, "ההרשמה נכשלה"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const target = pendingEmail || email.trim().toLowerCase();
    if (!target) {
      setError("הזן אימייל");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const sendRes = await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        setError((sendData as { detail?: string }).detail || "שליחה מחדש נכשלה");
        return;
      }
      setStatus((sendData as { detail?: string }).detail || "נשלח שוב");
    } catch (err) {
      setError(extractApiError(err, "שליחה מחדש נכשלה"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setLoading(true); setError("");
    const r = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setError(d.error); return; }
    setStatus(d.message);
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} style={{ width: "100%", background: "var(--navy-c)", border: "1px solid var(--navy-b)", borderRadius: 8, color: "var(--cream)", fontFamily: "Heebo,sans-serif", fontSize: ".9rem", padding: "10px 12px", textAlign: "right", outline: "none", ...props.style }} />
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--navy-c)", border: "1px solid var(--navy-b)", borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.3rem", fontWeight: 900, color: "var(--cream)", textAlign: "center", marginBottom: 20 }}>
          🎯 {mode === "login" ? "כניסה" : mode === "register" ? "הרשמה" : mode === "verify-pending" ? "אימות אימייל" : "שכחתי סיסמה"}
        </h1>

        {apiStatus && (!apiStatus.configured || !apiStatus.backendReachable) && (
          <div
            role="alert"
            style={{
              background: "rgba(232,160,48,.1)",
              border: "1px solid rgba(232,160,48,.35)",
              color: "#e8c870",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".75rem",
              lineHeight: 1.5,
              marginBottom: 14,
              textAlign: "right",
            }}
          >
            {!apiStatus.configured ? (
              <>
                <strong>API_BASE_URL חסר</strong> — ב-Railway → שירות <strong>Frontend</strong> → Variables:
                <br />
                <code style={{ fontSize: ".68rem", display: "block", marginTop: 6, wordBreak: "break-all" }}>
                  API_BASE_URL=https://eloquent-perfection-production-de3d.up.railway.app/api
                </code>
                <a href="/api/runtime-config" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", fontSize: ".68rem" }}>
                  בדיקת runtime-config →
                </a>
              </>
            ) : (
              <>
                <strong>Backend לא מגיב</strong>
                {apiStatus.hint ? ` — ${apiStatus.hint}` : ""}. ודא ששירות Backend רץ (Deploy + Logs).
              </>
            )}
          </div>
        )}
        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(232,0,30,.12)",
              border: "1px solid rgba(232,0,30,.45)",
              color: "#ff8a96",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: ".8rem",
              lineHeight: 1.45,
              marginBottom: 14,
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}
        {status && <div style={{ background: "rgba(29,185,106,.1)", border: "1px solid rgba(29,185,106,.3)", color: "var(--green)", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", marginBottom: 14 }}>{status}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "login" && (
            <>
              {inp({ placeholder: "אימייל", type: "email", autoComplete: "email", value: email, onChange: e => setEmail(e.target.value) })}
              {inp({ placeholder: "סיסמה", type: "password", autoComplete: "current-password", value: password, onChange: e => setPassword(e.target.value), onKeyDown: e => e.key === "Enter" && handleLogin() })}
              <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={handleLogin} disabled={loading}>{loading ? "מתחבר..." : "כניסה"}</button>
              <p style={{ fontSize: ".68rem", color: "var(--muted)", textAlign: "center", margin: 0 }}>
                מנהל: admin@admin.com / admin
              </p>
              {googleEnabled && (
                <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => { window.location.href = "/api/auth/google"; }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginLeft: 6 }}><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  כניסה עם Google
                </button>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: ".72rem", cursor: "pointer" }} onClick={() => go("forgot")}>שכחתי סיסמה</button>
                <button style={{ background: "none", border: "none", color: "var(--gold)", fontSize: ".72rem", cursor: "pointer" }} onClick={() => go("register")}>הרשמה חדשה</button>
              </div>
            </>
          )}
          {mode === "register" && (
            <>
              {inp({ placeholder: "שם מלא", value: name, onChange: e => setName(e.target.value) })}
              {inp({ placeholder: "אימייל", type: "email", value: email, onChange: e => setEmail(e.target.value) })}
              {inp({ placeholder: "טלפון (+972...)", value: phone, onChange: e => setPhone(e.target.value) })}
              {inp({ placeholder: "סיסמה", type: "password", value: password, onChange: e => setPassword(e.target.value), onKeyDown: e => e.key === "Enter" && handleRegister() })}
              <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={handleRegister} disabled={loading}>{loading ? "..." : "הרשמה"}</button>
              <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: ".72rem", cursor: "pointer" }} onClick={() => go("login")}>כבר רשום? התחבר</button>
            </>
          )}
          {mode === "verify-pending" && (
            <>
              <p style={{ fontSize: ".8rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                שלחנו קישור אימות ל-<strong style={{ color: "var(--cream)" }}>{pendingEmail}</strong>.
                <br />
                לחץ על הקישור באימייל כדי להפעיל את החשבון.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleResendVerification}
                disabled={loading}
              >
                {loading ? "שולח..." : "שלח שוב אימייל אימות"}
              </button>
              <button
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: ".72rem", cursor: "pointer" }}
                onClick={() => go("login")}
              >
                חזרה לכניסה
              </button>
            </>
          )}
          {mode === "forgot" && (
            <>
              {inp({ placeholder: "אימייל", value: email, onChange: e => setEmail(e.target.value), onKeyDown: e => e.key === "Enter" && handleForgot() })}
              <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={handleForgot} disabled={loading}>{loading ? "..." : "שלח קישור איפוס"}</button>
              <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: ".72rem", cursor: "pointer" }} onClick={() => go("login")}>חזרה לכניסה</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען...</div>}>
        <AuthForm />
      </Suspense>
    </>
  );
}
