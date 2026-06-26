"use client";

import Link from "next/link";

export default function RegisterNudge({ hint }: { hint?: string }) {
  return (
    <div className="register-nudge" role="note">
      <div className="register-nudge-text">
        <strong>אורח</strong>
        <span>
          {hint || "הירשם בחינם כדי לשמור מסמכים, לייצא PDF ולשלוח לחתימה"}
        </span>
      </div>
      <Link href="/auth" className="register-nudge-btn">
        הרשמה / כניסה
      </Link>
    </div>
  );
}
