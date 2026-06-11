"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { id: "main", href: "/", label: "מרכזיים", exact: true },
  { id: "lotto", href: "/lotto", label: "לוטו" },
  { id: "seven", href: "/seven77", label: "777" },
  { id: "toto", href: "/toto", label: "טוטו" },
  { id: "premium", href: "/#premium", label: "פרימיום" },
  { id: "pricing", href: "/#pricing", label: "מחירים" },
] as const;

export default function WinnerTabBar() {
  const path = usePathname() ?? "";

  return (
    <nav className="winner-tabs" aria-label="קטגוריות">
      <div className="winner-tabs-inner">
        {TABS.map((tab) => {
          const exact = "exact" in tab && tab.exact;
          const active = exact ? path === tab.href : path === tab.href || path.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`winner-tab${active ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
