"use client";

/** Decorative crown, diamond and sparkles for premium banners — neutral gray. */

export function PremiumSparkles({ count = 24 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 4.1 + 2) % 100}%`,
    top: `${(i * 7.3 + 5) % 100}%`,
    size: 2 + (i % 3),
    delay: `${(i * 0.35) % 4}s`,
    dur: `${2.5 + (i % 4) * 0.6}s`,
  }));

  return (
    <div className="premium-sparkles" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="premium-sparkle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

export function PremiumCrown({ className = "" }: { className?: string }) {
  return (
    <div className={`premium-banner-crown-wrap ${className}`.trim()} aria-hidden>
      <svg className="premium-banner-crown" viewBox="0 0 120 100" fill="none">
        <defs>
          <linearGradient id="crownSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="crownGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#94a3b8" floodOpacity="0.45" />
          </filter>
        </defs>
        <path
          d="M10 72 L18 38 L34 52 L60 22 L86 52 L102 38 L110 72 Z"
          fill="url(#crownSilver)"
          filter="url(#crownGlow)"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <rect x="10" y="72" width="100" height="14" rx="3" fill="url(#crownSilver)" stroke="#64748b" strokeWidth="1" />
        <circle cx="34" cy="52" r="5" fill="#f1f5f9" opacity="0.7" />
        <circle cx="60" cy="30" r="6" fill="#f1f5f9" opacity="0.8" />
        <circle cx="86" cy="52" r="5" fill="#f1f5f9" opacity="0.7" />
      </svg>
    </div>
  );
}

export function PremiumDiamond({ className = "" }: { className?: string }) {
  return (
    <div className={`premium-banner-diamond-wrap ${className}`.trim()} aria-hidden>
      <svg className="premium-banner-diamond" viewBox="0 0 90 100" fill="none">
        <defs>
          <linearGradient id="diamondSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <polygon
          points="45,8 82,32 82,68 45,92 8,68 8,32"
          fill="none"
          stroke="url(#diamondSilver)"
          strokeWidth="2.5"
        />
        <polygon points="45,22 68,38 68,62 45,78 22,62 22,38" fill="rgba(148,163,184,0.15)" stroke="#94a3b8" strokeWidth="1" />
        <polygon points="45,32 58,42 58,58 45,68 32,58 32,42" fill="url(#diamondSilver)" opacity="0.9" />
        <path d="M45 32 L52 45 L45 58 L38 45 Z" fill="#f1f5f9" opacity="0.5" />
      </svg>
    </div>
  );
}
