"use client";

/** Mandeles Premium Club logo — neutral gray crown + wordmark. */
export default function MandelesLogoMark({
  size = "md",
  showText = true,
  variant = "default",
  theme = "dark",
  accent = "gray",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "club";
  theme?: "dark" | "light";
  accent?: "gray" | "gold";
}) {
  const dim = size === "lg" ? 44 : size === "sm" ? 28 : 36;
  const fontSize = size === "lg" ? "1.05rem" : size === "sm" ? "0.68rem" : "0.88rem";
  const circleFill = theme === "light" ? "#1e293b" : "#0a0e17";
  const circleStroke = accent === "gray" ? "#94a3b8" : "var(--gold-border)";

  return (
    <span
      className={`mandeles-logo-mark${theme === "light" ? " mandeles-logo-mark--light" : ""}${accent === "gray" ? " mandeles-logo-mark--gray" : ""}`}
      style={{ fontSize }}
    >
      <svg
        className="mandeles-logo-icon"
        width={dim}
        height={dim}
        viewBox="0 0 48 48"
        aria-hidden
      >
        <defs>
          <linearGradient id="logoCrownSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill={circleFill} stroke={circleStroke} strokeWidth="2" />
        <path
          d="M12 30 L16 18 L22 24 L24 14 L26 24 L32 18 L36 30 Z"
          fill="url(#logoCrownSilver)"
          stroke="#64748b"
          strokeWidth="0.8"
        />
        <rect x="12" y="30" width="24" height="5" rx="1" fill="url(#logoCrownSilver)" />
      </svg>
      {showText && (
        <span className="mandeles-logo-text">
          <span className="mandeles-logo-name">MANDELES</span>
          {variant === "club" ? (
            <span className="mandeles-logo-club">PREMIUM CLUB</span>
          ) : (
            <span className="mandeles-logo-tld">.co.il</span>
          )}
        </span>
      )}
    </span>
  );
}
