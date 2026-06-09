"use client";

/** Animated Mandeles logo mark — target + wordmark. */
export default function MandelesLogoMark({
  size = "md",
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const dim = size === "lg" ? 44 : size === "sm" ? 28 : 36;
  const fontSize = size === "lg" ? "1.15rem" : size === "sm" ? "0.72rem" : "0.92rem";

  return (
    <span className="mandeles-logo-mark" style={{ fontSize }}>
      <svg
        className="mandeles-logo-icon"
        width={dim}
        height={dim}
        viewBox="0 0 48 48"
        aria-hidden
      >
        <circle cx="24" cy="24" r="22" fill="#1c1208" stroke="#e8c060" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="14" fill="none" stroke="#c9a030" strokeWidth="2" opacity="0.85" />
        <circle cx="24" cy="24" r="6" fill="#c9a030" />
        <circle cx="24" cy="24" r="2.5" fill="#1c1208" />
      </svg>
      {showText && (
        <span className="mandeles-logo-text">
          Mandeles<span className="mandeles-logo-tld">.co.il</span>
        </span>
      )}
    </span>
  );
}
