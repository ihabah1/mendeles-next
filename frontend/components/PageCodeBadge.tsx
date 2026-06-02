"use client";

import { usePathname } from "next/navigation";
import { getPageCodeForPath } from "@/lib/pageCodes";

export default function PageCodeBadge() {
  const pathname = usePathname();
  const entry = getPageCodeForPath(pathname);

  if (!entry) return null;

  return (
    <span
      title={`${entry.labelHe} — מקרא לבקשות AI`}
      data-page-code={entry.code}
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: ".68rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "var(--gold)",
        background: "rgba(201,168,76,.1)",
        border: "1px solid rgba(201,168,76,.28)",
        borderRadius: 5,
        padding: "3px 8px",
        flexShrink: 0,
      }}
    >
      {entry.code}
    </span>
  );
}
