"use client";

import Link from "next/link";
import MandelesLogoMark from "./MandelesLogoMark";

const RAIL_CARDS = {
  start: [
    {
      icon: "🎱",
      title: "לוטו מקצועי",
      lines: ["200 סטים חכמים", "מילוי והגשה לפיס"],
      href: "/lotto",
      variant: "gold",
    },
    {
      icon: "⚡",
      title: "הזמנה מהירה",
      lines: ["בחר טבלאות", "שלח לתור הדפסה"],
      href: "/lotto",
      variant: "green",
    },
  ],
  end: [
    {
      icon: "👤",
      title: "אזור אישי",
      lines: ["הזמנות וסריקות", "יתרה וחשבוניות"],
      href: "/profile",
      variant: "navy",
    },
    {
      icon: "🏆",
      title: "בדיקת זכייה",
      lines: ["עדכון אוטומטי", "זיכוי לארנק"],
      href: "/profile/orders",
      variant: "red",
    },
  ],
} as const;

function RailCard({
  icon,
  title,
  lines,
  href,
  variant,
}: {
  icon: string;
  title: string;
  lines: readonly string[];
  href: string;
  variant: string;
}) {
  return (
    <Link href={href} className={`promo-rail-card promo-rail-card--${variant}`}>
      <span className="promo-rail-card-shine" aria-hidden />
      <span className="promo-rail-card-icon" aria-hidden>
        {icon}
      </span>
      <span className="promo-rail-card-title">{title}</span>
      {lines.map((line) => (
        <span key={line} className="promo-rail-card-line">
          {line}
        </span>
      ))}
      <span className="promo-rail-card-cta">לחץ כאן ←</span>
    </Link>
  );
}

export function PromoRailColumn({ side }: { side: "start" | "end" }) {
  const cards = RAIL_CARDS[side];
  return (
    <aside className={`promo-side-rail promo-side-rail--${side}`} aria-label="מבצעים בצד">
      <div className="promo-side-rail-header">
        <MandelesLogoMark size="sm" showText={false} />
        <span>Mandeles</span>
      </div>
      {cards.map((c) => (
        <RailCard key={c.title} {...c} />
      ))}
      <div className="promo-side-rail-badge">
        <span>18+</span>
        <small>הימורים באחריות</small>
      </div>
    </aside>
  );
}

export default function PromoSideRails() {
  return (
    <>
      <PromoRailColumn side="start" />
      <PromoRailColumn side="end" />
    </>
  );
}
