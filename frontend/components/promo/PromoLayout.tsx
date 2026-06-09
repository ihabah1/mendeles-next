"use client";

import { usePathname } from "next/navigation";
import { PromoRailColumn } from "./PromoSideRails";

const HIDE_PREFIXES = ["/admin", "/auth"];

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const hideRails = HIDE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (hideRails) {
    return <>{children}</>;
  }

  return (
    <div className="promo-layout">
      <PromoRailColumn side="start" />
      <div className="promo-layout-main">{children}</div>
      <PromoRailColumn side="end" />
    </div>
  );
}
