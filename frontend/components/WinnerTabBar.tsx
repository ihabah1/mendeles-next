"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccessDevGames } from "@/lib/lotto-only";

const ALL_TABS = [
  { id: "main", href: "/", label: "מרכזיים", exact: true, devOnly: false },
  { id: "lotto", href: "/lotto", label: "לוטו", devOnly: false },
  { id: "seven", href: "/seven77", label: "777", devOnly: true },
  { id: "toto", href: "/toto", label: "טוטו", devOnly: false },
  { id: "premium", href: "/#premium", label: "פרימיום", devOnly: false },
  { id: "pricing", href: "/pricing", label: "מחירים", devOnly: false },
] as const;

export default function WinnerTabBar() {
  const path = usePathname() ?? "";
  const { isStaff } = useAuth();
  const showDev = canAccessDevGames(isStaff);
  const tabs = ALL_TABS.filter((t) => !t.devOnly || showDev);

  return (
    <nav className="winner-tabs" aria-label="קטגוריות">
      <div className="winner-tabs-inner">
        {tabs.map((tab) => {
          const exact = "exact" in tab && tab.exact;
          const active = exact
            ? path === tab.href
            : path === tab.href || path.startsWith(`${tab.href}/`);
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
