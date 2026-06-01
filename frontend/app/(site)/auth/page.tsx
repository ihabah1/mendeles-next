"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { extractApiError } from "@/lib/api/client";

type Mode = "login" | "register" | "forgot";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/lotto";
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!email || !password) { setError("יש למלא אימייל וסיסמה"); return; }
    setLoading(true); setError("");
    try {
      await register({ email, password, first_name: name, phone });
      router.push(redirect);
    } catch (err) {
      setError(extractApiError(err, "ההרשמה נכשלה"));
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
          🎯 {mode === "login" ? "כניסה" : mode === "register" ? "הרשמה" : "שכחתי סיסמה"}
        </h1>

        {error && <div style={{ background: "rgba(232,0,30,.1)", border: "1px solid rgba(232,0,30,.3)", color: "#ff6b7a", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", marginBottom: 14 }}>{error}</div>}
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
              <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => window.location.href = "/api/auth/google"}>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginLeft: 6 }}><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                כניסה עם Google
              </button>
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
