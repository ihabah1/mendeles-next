"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "mandeles-cookie-consent";

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    setVisible(false);
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="cookie-notice" role="region" aria-label="הודעת Cookies">
      <span className="cookie-notice-icon" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <circle cx="12" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      </span>
      <p className="cookie-notice-text">
        לידיעתך: באתר זה נעשה שימוש בקבצי Cookies כדי לספק לך חווית גלישה טובה ותכנים מותאמים אישית.
        המשך גלישה באתר מהווה הסכמתך לכך
      </p>
      <button type="button" className="cookie-notice-btn" onClick={accept}>
        הבנתי
      </button>
    </div>
  );
}
