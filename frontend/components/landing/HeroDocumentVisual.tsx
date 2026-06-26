/** Hero illustration — PDF document with signature + floating feature tiles. */
export default function HeroDocumentVisual() {
  return (
    <div className="landing-hero-visual" aria-hidden>
      <svg className="landing-hero-connectors" viewBox="0 0 400 360" fill="none">
        <path
          d="M72 52 C 120 80, 140 40, 185 95"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <path
          d="M318 88 C 270 110, 250 70, 210 120"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <path
          d="M58 248 C 110 220, 130 270, 175 210"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <path
          d="M328 268 C 280 240, 260 290, 215 230"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>

      <div className="landing-hero-doc">
        <div className="landing-hero-doc-header">
          <span className="landing-hero-doc-dot" />
          <span className="landing-hero-doc-dot" />
          <span className="landing-hero-doc-dot" />
        </div>
        <div className="landing-hero-doc-body">
          <div className="landing-hero-doc-line landing-hero-doc-line--lg" />
          <div className="landing-hero-doc-line" />
          <div className="landing-hero-doc-line" />
          <div className="landing-hero-doc-line landing-hero-doc-line--short" />
          <div className="landing-hero-doc-sig-block">
            <span className="landing-hero-doc-sig-label">חתימה</span>
            <svg className="landing-hero-doc-sig" viewBox="0 0 120 40" fill="none">
              <path
                d="M8 28 C 22 8, 38 36, 52 18 S 78 32, 108 14"
                stroke="#475569"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <div className="landing-hero-doc-badge">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#475569" />
            <path
              d="M7 12.5l3 3 7-7"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="landing-hero-tile landing-hero-tile--1">
        <span className="landing-hero-tile-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20h16M7 17l3-9 4 6 3-4 3 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>חתימה</span>
      </div>
      <div className="landing-hero-tile landing-hero-tile--2">
        <span className="landing-hero-tile-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V8m0 0l-3 3m3-3l3 3M5 18h14a2 2 0 0 0 2-2V8l-4-4H7L5 8v8a2 2 0 0 0 2 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>שליחה</span>
      </div>
      <div className="landing-hero-tile landing-hero-tile--3">
        <span className="landing-hero-tile-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="currentColor" />
            <path d="M18 14l.8 2.4L21 17l-2.2.6L18 20l-.8-2.4L15 17l2.2-.6L18 14z" fill="currentColor" opacity=".7" />
          </svg>
        </span>
        <span>AI מילוי אוטומטי</span>
      </div>
      <div className="landing-hero-tile landing-hero-tile--4">
        <span className="landing-hero-tile-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="14" width="4" height="6" rx="1" fill="currentColor" />
            <rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" />
            <rect x="16" y="6" width="4" height="14" rx="1" fill="currentColor" />
          </svg>
        </span>
        <span>מעקב</span>
      </div>
    </div>
  );
}
