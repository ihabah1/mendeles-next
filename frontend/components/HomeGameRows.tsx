"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccessDevGames } from "@/lib/lotto-only";

const ALL_ROWS = [
  {
    time: "הגרלה הבאה",
    title: "לוטו — 14 טבלאות, מספר חזק",
    href: "/lotto",
    odds: [
      { label: "מילוי ידני", val: "₪2.5+" },
      { label: "200 סטים", val: "₪25" },
      { label: "פרימיום", val: "₪50" },
    ],
    devOnly: false,
  },
  {
    time: "בקרוב",
    title: "777 — משחק מזל מהיר",
    href: "/seven77",
    odds: [
      { label: "טבלה אחת", val: "₪5" },
      { label: "3 טבלאות", val: "₪12" },
      { label: "מקסימום", val: "₪40" },
    ],
    devOnly: true,
  },
  {
    time: "בקרוב",
    title: "טוטו — ניתוח סטטיסטי",
    href: "/toto",
    odds: [
      { label: "16 משחקים", val: "₪8" },
      { label: "ניתוח AI", val: "חינם" },
      { label: "הגשה", val: "₪15" },
    ],
    devOnly: true,
  },
] as const;

export default function HomeGameRows() {
  const { isStaff } = useAuth();
  const showDev = canAccessDevGames(isStaff);
  const rows = ALL_ROWS.filter((r) => !r.devOnly || showDev);

  return (
    <>
      {rows.map((row) => (
        <div key={row.title} className="winner-row">
          <div className="winner-row-info">
            <span className="winner-row-time">{row.time}</span>
            <div>{row.title}</div>
          </div>
          <div className="winner-odds">
            {row.odds.map((o) => (
              <Link key={o.label} href={row.href} className="winner-odd-btn">
                <span className="winner-odd-label">{o.label}</span>
                <span className="winner-odd-val">{o.val}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
