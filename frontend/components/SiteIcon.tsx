"use client";

/** Mandeles target mark — site icon without wordmark. */
export default function SiteIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      className="site-icon"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#cbd5e1" strokeWidth="2" opacity="0.85" />
      <circle cx="24" cy="24" r="6" fill="#94a3b8" />
      <circle cx="24" cy="24" r="2.5" fill="#1e293b" />
    </svg>
  );
}
