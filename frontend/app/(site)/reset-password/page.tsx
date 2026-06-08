"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password !== confirm) { setError("הסיסמאות לא תואמות"); return; }
    if (password.length < 8) { setError("סיסמה חייבת להכיל לפחות 8 תווים"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setError(d.error); return; }
    setStatus("הסיסמה עודכנה! מעביר לדף הכניסה...");
    setTimeout(() => router.push("/auth"), 2000);
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="input" style={props.style} />
  );

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ padding: "28px 24px", width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 900, color: "var(--text)", textAlign: "center", marginBottom: 20 }}>🔐 איפוס סיסמה</h1>
        {error && <div style={{ background: "rgba(232,0,30,.1)", border: "1px solid rgba(232,0,30,.3)", color: "#c01820", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", marginBottom: 14 }}>{error}</div>}
        {status && <div style={{ background: "rgba(29,185,106,.1)", border: "1px solid rgba(29,185,106,.3)", color: "var(--green)", borderRadius: 8, padding: "8px 12px", fontSize: ".78rem", marginBottom: 14 }}>{status}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {inp({ type: "password", placeholder: "סיסמה חדשה (לפחות 8 תווים)", value: password, onChange: e => setPassword(e.target.value) })}
          {inp({ type: "password", placeholder: "אימות סיסמה", value: confirm, onChange: e => setConfirm(e.target.value), onKeyDown: e => e.key === "Enter" && submit() })}
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: 12 }} onClick={submit} disabled={loading}>
            {loading ? "..." : "עדכן סיסמה"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>טוען...</div>}>
        <ResetForm />
      </Suspense>
    </>
  );
}
