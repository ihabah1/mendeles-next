"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { ensureFirebaseConfig } from "@/lib/firebase";
import { GOOGLE_OAUTH_ERRORS } from "@/lib/auth/google-oauth";

type Mode = "login" | "register" | "forgot" | "verify-pending" | "phone-verify";

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
  const [phoneOtp, setPhoneOtp] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean;
    backendReachable: boolean;
    hint: string | null;
  } | null>(null);
  const [smsAfterEmail, setSmsAfterEmail] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect);
      return;
    }
    const oauthError = params.get("error");
    if (oauthError && GOOGLE_OAUTH_ERRORS[oauthError]) {
      setError(GOOGLE_OAUTH_ERRORS[oauthError]);
    }
    const modeParam = params.get("mode");
    if (modeParam === "phone-verify") {
      const em = params.get("email")?.trim().toLowerCase() || "";
      if (em) {
        setPendingEmail(em);
        go("phone-verify");
      }
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

    resolveApiBaseUrl()
      .then((base) => fetch(`${base}/auth/phone-verification-status/`, { cache: "no-store" }))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { required_after_email?: boolean } | null) => {
        setSmsAfterEmail(Boolean(d?.required_after_email));
      })
      .catch(() => {
        void ensureFirebaseConfig().then((cfg) => setSmsAfterEmail(Boolean(cfg)));
      });
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
      const msg = extractApiError(err, "אימייל או סיסמה שגויים");
      if (msg.includes("טלפון") || msg.includes("SMS")) {
        setError(msg);
        router.push(`/verify-phone?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      setError(msg);
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
        if (!res.verification_payload) {
          setError(
            "החשבון נוצר אך חסר קישור אימות מהשרת. לחץ «שלח שוב אימייל אימות» בעמוד הבא.",
          );
          setPendingEmail(res.email);
          go("verify-pending");
          return;
        }
        const sendRes = await fetch("/api/email/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: res.email,
            verification_payload: res.verification_payload,
          }),
        });
        const sendData = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) {
          const detail = (sendData as { detail?: string }).detail;
          setError(detail || "שליחת אימייל האימות נכשלה");
          setPendingEmail(res.email);
          go("verify-pending");
          return;
        }
        setStatus((sendData as { detail?: string }).detail || res.detail);
      } else {
        setStatus(res.detail);
      }
      setPendingEmail(res.email);
      if (res.phone) setPendingPhone(res.phone);
      if (phone.trim()) {
        try {
          sessionStorage.setItem("reg_phone", phone.trim());
        } catch {
          /* ignore */
        }
      }
      if (res.phone_verification_required) setSmsAfterEmail(true);
      if (res.dev_otp) setStatus((s) => `${s} קוד SMS (פיתוח): ${res.dev_otp}`.trim());
      go("verify-pending");
    } catch (err) {
      const msg = extractApiError(err, "ההרשמה נכשלה");
      if (/user not found/i.test(msg)) {
        setError(
          "האימייל כבר קיים במערכת. בדוק את תיבת הדואר (גם בספאם) לאימות, או לחץ «כבר רשום? התחבר».",
        );
      } else if (/כבר רשומ|קיימת כבר|קיים כבר/i.test(msg)) {
        setError(
          "האימייל כבר רשומה. אם לא אימתת — בדוק ספאם; אחרת התחבר עם הסיסמה שהגדרת.",
        );
      } else if (/לא ניתן להגיע ל-backend/i.test(msg)) {
        setError("השרת לא זמין כרגע — המתן דקה ונסה שוב.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    const targetEmail = pendingEmail || email.trim().toLowerCase();
    const code = phoneOtp.trim();
    if (!targetEmail || code.length < 4) {
      setError("הזן קוד SMS בן 6 ספרות");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authService.verifyPhone(targetEmail, code);
      setStatus(res.detail);
      router.push(redirect);
    } catch (err) {
      setError(extractApiError(err, "קוד שגוי או שפג תוקפו"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    const target = pendingEmail || email.trim().toLowerCase();
    if (!target) {
      setError("חסר אימייל");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authService.resendPhoneOtp(target);
      setStatus(res.detail);
    } catch (err) {
      setError(extractApiError(err, "שליחה מחדש נכשלה"));
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
    <input {...props} className="input" style={props.style} />
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ padding: "28px 24px", width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 900, color: "var(--text)", textAlign: "center", marginBottom: 20 }}>
          🎯 {mode === "login" ? "כניסה" : mode === "register" ? "הרשמה" : mode === "verify-pending" ? "אימות אימייל" : mode === "phone-verify" ? "אימות SMS" : "שכחתי סיסמה"}
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
              <p style={{ fontSize: ".68rem", color: "var(--text2)", textAlign: "center", margin: 0 }}>
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
              {inp({ placeholder: "טלפון (050-1234567)", type: "tel", value: phone, onChange: e => setPhone(e.target.value) })}
              <p style={{ fontSize: ".7rem", color: "var(--text2)", margin: "-4px 0 0", lineHeight: 1.45 }}>
                מספר זה ישמש לאימות SMS לאחר אימות האימייל
              </p>
              {inp({ placeholder: "סיסמה", type: "password", value: password, onChange: e => setPassword(e.target.value), onKeyDown: e => e.key === "Enter" && handleRegister() })}
              <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={handleRegister} disabled={loading}>{loading ? "..." : "הרשמה"}</button>
              <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: ".72rem", cursor: "pointer" }} onClick={() => go("login")}>כבר רשום? התחבר</button>
            </>
          )}
          {mode === "verify-pending" && (
            <>
              <p style={{ fontSize: ".8rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                שלחנו קישור אימות ל-<strong style={{ color: "var(--text)" }}>{pendingEmail}</strong>.
                <br />
                לחץ על הקישור באימייל כדי להמשיך.
              </p>
              {smsAfterEmail && (
                <p
                  style={{
                    fontSize: ".78rem",
                    color: "var(--gold)",
                    textAlign: "center",
                    lineHeight: 1.55,
                    margin: "12px 0 0",
                    padding: "10px 12px",
                    background: "rgba(201,168,76,.08)",
                    borderRadius: 8,
                    border: "1px solid rgba(201,168,76,.25)",
                  }}
                >
                  שלב 2: אחרי אימות האימייל יישלח קוד SMS למספר שהזנת בהרשמה — רק להזין את הקוד.
                </p>
              )}
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
          {mode === "phone-verify" && (
            <>
              <p style={{ fontSize: ".8rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                הזן את קוד ה-SMS שנשלח
                {pendingPhone ? (
                  <> ל-<strong style={{ color: "var(--text)" }}>{pendingPhone}</strong></>
                ) : null}
                .
              </p>
              {inp({
                placeholder: "קוד 6 ספרות",
                inputMode: "numeric",
                maxLength: 6,
                value: phoneOtp,
                onChange: (e) => setPhoneOtp(e.target.value.replace(/\D/g, "")),
                onKeyDown: (e) => e.key === "Enter" && handleVerifyPhone(),
              })}
              <button
                type="button"
                className="btn btn-gold"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleVerifyPhone}
                disabled={loading}
              >
                {loading ? "מאמת..." : "אימות טלפון"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center", padding: 12 }}
                onClick={handleResendPhoneOtp}
                disabled={loading}
              >
                שלח קוד שוב
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
