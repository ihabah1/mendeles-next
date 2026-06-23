"use client";

import { useState } from "react";
import Link from "next/link";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";

export default function ProfilePasswordSection() {
  const [current, setCurrent] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async () => {
    if (nextPw.length < 8) {
      setError("סיסמה חדשה — לפחות 8 תווים");
      return;
    }
    if (nextPw !== confirm) {
      setError("הסיסמאות החדשות לא תואמות");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await authService.changePassword(current, nextPw);
      setSuccess(res.detail);
      setCurrent("");
      setNextPw("");
      setConfirm("");
    } catch (err) {
      setError(extractApiError(err, "עדכון סיסמה נכשל"));
    } finally {
      setLoading(false);
    }
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="input" type="password" autoComplete="off" />
  );

  return (
    <section id="password" className="profile-password-section">
      <h3 className="profile-section-title">🔐 שינוי סיסמה</h3>
      <p className="profile-panel-desc">הזן את הסיסמה הנוכחית ואת הסיסמה החדשה</p>

      <div className="profile-form">
        <label className="profile-label">
          סיסמה נוכחית
          {inp({ value: current, onChange: (e) => setCurrent(e.target.value), autoComplete: "current-password" })}
        </label>
        <label className="profile-label">
          סיסמה חדשה
          {inp({ value: nextPw, onChange: (e) => setNextPw(e.target.value), autoComplete: "new-password" })}
        </label>
        <label className="profile-label">
          אימות סיסמה חדשה
          {inp({ value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: "new-password" })}
        </label>
      </div>

      {error && <div className="profile-alert error">{error}</div>}
      {success && <div className="profile-alert success">{success}</div>}

      <button
        type="button"
        className="btn btn-gold"
        style={{ marginTop: 12 }}
        onClick={submit}
        disabled={loading}
      >
        {loading ? "מעדכן..." : "עדכן סיסמה"}
      </button>

      <p className="profile-panel-desc" style={{ marginTop: 16, marginBottom: 8 }}>
        שכחת את הסיסמה?
      </p>
      <Link href="/auth" className="btn btn-outline btn-sm">
        איפוס סיסמה באימייל
      </Link>
    </section>
  );
}
