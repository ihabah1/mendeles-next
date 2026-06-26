"use client";

import { usePathname } from "next/navigation";
import { PromoRailColumn } from "./PromoSideRails";

const HIDE_PREFIXES = ["/auth", "/"];

/** Pages with light center column + premium side rails */
const LANDING_PREFIXES = ["/", "/dashboard", "/pricing", "/about", "/terms"];

function isLandingPath(path: string): boolean {
  if (path === "/") return true;
  return LANDING_PREFIXES.some((p) => p !== "/" && (path === p || path.startsWith(`${p}/`)));
}

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const hideRails = HIDE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const landing = isLandingPath(path);

  if (hideRails) {
    return <>{children}</>;
  }

  return (
    <div className={`promo-layout${landing ? " promo-layout--landing" : ""}`}>
      <PromoRailColumn side="start" landing={landing} />
      <div className="promo-layout-main">{children}</div>
      <PromoRailColumn side="end" landing={landing} />
    </div>
  );
}
