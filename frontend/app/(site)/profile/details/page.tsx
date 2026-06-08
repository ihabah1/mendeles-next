"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { authService } from "@/lib/api/auth";
import { extractApiError } from "@/lib/api/client";

export default function ProfileDetailsPage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setPhone(user.phone || "");
  }, [user]);

  const save = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await authService.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      await refreshUser();
      setSuccess("הפרטים נשמרו בהצלחה");
    } catch (err) {
      setError(extractApiError(err, "שמירה נכשלה"));
    } finally {
      setLoading(false);
    }
  };

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="input" />
  );

  return (
    <div>
      <h2 className="profile-panel-title">👤 שינוי פרטים אישיים</h2>
      <p className="profile-panel-desc">עדכן שם וטלפון. האימייל אינו ניתן לשינוי כאן.</p>

      <div className="profile-form">
        <label className="profile-label">
          שם פרטי
          {inp({ value: firstName, onChange: (e) => setFirstName(e.target.value) })}
        </label>
        <label className="profile-label">
          שם משפחה
          {inp({ value: lastName, onChange: (e) => setLastName(e.target.value) })}
        </label>
        <label className="profile-label">
          טלפון
          {inp({ type: "tel", value: phone, onChange: (e) => setPhone(e.target.value), placeholder: "050-1234567" })}
        </label>
        <label className="profile-label">
          אימייל
          {inp({ type: "email", value: user?.email || "", disabled: true })}
        </label>
      </div>

      {error && <div className="profile-alert error">{error}</div>}
      {success && <div className="profile-alert success">{success}</div>}

      <button
        type="button"
        className="btn btn-gold"
        style={{ marginTop: 12 }}
        onClick={save}
        disabled={loading}
      >
        {loading ? "שומר..." : "שמור שינויים"}
      </button>
    </div>
  );
}
