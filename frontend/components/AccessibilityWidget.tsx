"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mandeles-a11y-settings";

type A11ySettings = {
  fontScale: number; // 0 | 1 | 2
  highContrast: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
  stopAnimations: boolean;
  readableFont: boolean;
};

const DEFAULTS: A11ySettings = {
  fontScale: 0,
  highContrast: false,
  grayscale: false,
  highlightLinks: false,
  stopAnimations: false,
  readableFont: false,
};

function applySettings(s: A11ySettings) {
  const root = document.documentElement;
  root.style.fontSize = s.fontScale === 2 ? "20px" : s.fontScale === 1 ? "18px" : "16px";
  root.classList.toggle("a11y-contrast", s.highContrast);
  root.classList.toggle("a11y-grayscale", s.grayscale);
  root.classList.toggle("a11y-links", s.highlightLinks);
  root.classList.toggle("a11y-no-motion", s.stopAnimations);
  root.classList.toggle("a11y-readable", s.readableFont);
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = { ...DEFAULTS, ...JSON.parse(saved) } as A11ySettings;
        setSettings(parsed);
        applySettings(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const update = (patch: Partial<A11ySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      applySettings(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    applySettings(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const toggles: { key: keyof A11ySettings; label: string; icon: string }[] = [
    { key: "highContrast", label: "ניגודיות גבוהה", icon: "🌓" },
    { key: "grayscale", label: "גווני אפור", icon: "⬜" },
    { key: "highlightLinks", label: "הדגשת קישורים", icon: "🔗" },
    { key: "stopAnimations", label: "עצירת אנימציות", icon: "⏸️" },
    { key: "readableFont", label: "פונט קריא", icon: "🔤" },
  ];

  return (
    <div className="a11y-root">
      {open && (
        <div className="a11y-panel" role="dialog" aria-label="התאמות נגישות">
          <div className="a11y-panel-head">
            <span>♿ התאמות נגישות</span>
            <button type="button" className="a11y-close" onClick={() => setOpen(false)} aria-label="סגור">
              ✕
            </button>
          </div>

          <div className="a11y-section">
            <span className="a11y-section-label">גודל טקסט</span>
            <div className="a11y-font-row">
              {[
                { v: 0, label: "רגיל" },
                { v: 1, label: "גדול" },
                { v: 2, label: "גדול מאוד" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={`a11y-option${settings.fontScale === opt.v ? " active" : ""}`}
                  onClick={() => update({ fontScale: opt.v })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="a11y-section">
            {toggles.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`a11y-toggle${settings[t.key] ? " active" : ""}`}
                onClick={() => update({ [t.key]: !settings[t.key] } as Partial<A11ySettings>)}
                aria-pressed={Boolean(settings[t.key])}
              >
                <span aria-hidden>{t.icon}</span>
                <span>{t.label}</span>
                <span className="a11y-toggle-state">{settings[t.key] ? "פעיל" : "כבוי"}</span>
              </button>
            ))}
          </div>

          <div className="a11y-panel-foot">
            <button type="button" className="a11y-reset" onClick={reset}>
              איפוס הגדרות
            </button>
            <Link href="/accessibility" className="a11y-statement" onClick={() => setOpen(false)}>
              הצהרת נגישות
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        className="a11y-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="פתח התאמות נגישות"
        title="התאמות נגישות"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="4.5" r="2.2" />
          <path d="M12 8c-3 0-5.5-.6-7.5-1.2l-.5 1.9c1.8.55 3.7 1 5.5 1.15V12l-2.3 7.4 1.9.6 2.4-6.9h1l2.4 6.9 1.9-.6L14.5 12V9.85c1.8-.15 3.7-.6 5.5-1.15l-.5-1.9C17.5 7.4 15 8 12 8z" />
        </svg>
      </button>
    </div>
  );
}
