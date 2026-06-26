"use client";

import { usePathname } from "next/navigation";
import { PromoRailColumn } from "./PromoSideRails";

const HIDE_PREFIXES = ["/auth", "/", "/admin"];

const DOCS_RAIL_PREFIXES = ["/", "/dashboard", "/pricing", "/about", "/terms", "/profile", "/promotions"];

const LOTTO_RAIL_PREFIXES = ["/lotto", "/seven77", "/toto"];

function usesDocsRails(path: string): boolean {
  if (LOTTO_RAIL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }
  if (path === "/") return true;
  return DOCS_RAIL_PREFIXES.some((p) => p !== "/" && (path === p || path.startsWith(`${p}/`)));
}

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const hideRails = HIDE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const docsRails = usesDocsRails(path);

  if (hideRails) {
    return <>{children}</>;
  }

  return (
    <div className={`promo-layout${docsRails ? " promo-layout--docs" : ""}`}>
      <PromoRailColumn side="start" docsRails={docsRails} />
      <div className="promo-layout-main">{children}</div>
      <PromoRailColumn side="end" docsRails={docsRails} />
    </div>
  );
}
