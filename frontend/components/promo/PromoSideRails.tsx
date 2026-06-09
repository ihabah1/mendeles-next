"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    {
      icon: "🎰",
      title: "777",
      lines: ["משחק מזל", "הגשה מהירה"],
      href: "/seven77",
      variant: "purple",
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
    {
      icon: "💳",
      title: "ארנק דיגיטלי",
      lines: ["טעינה מאובטחת", "PayPal בקרוב"],
      href: "/profile",
      variant: "teal",
    },
  ],
} as const;

const RAIL_TICKERS = {
  start: [
    "🎯 200 סטים ייחודיים",
    "📋 מילוי מקצועי",
    "🚗 הגשה לפיס",
    "✨ אלגוריתם מנדל",
    "🔥 פרימיום זמין",
  ],
  end: [
    "📲 עדכון SMS",
    "🧾 חשבונית מס",
    "📸 מעקב סריקה",
    "💰 זיכוי זכיות",
    "🔒 תשלום מאובטח",
  ],
} as const;

const RAIL_STATS = {
  start: [
    { n: "200", l: "סטים" },
    { n: "37", l: "מספרים" },
    { n: "7", l: "חזק" },
  ],
  end: [
    { n: "24/7", l: "מעקב" },
    { n: "100%", l: "ייחודי" },
    { n: "18+", l: "בלבד" },
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

function RailTicker({ side }: { side: "start" | "end" }) {
  const items = RAIL_TICKERS[side];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3200);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="promo-side-rail-ticker" aria-live="polite">
      {items.map((item, i) => (
        <span key={item} className={`promo-side-rail-ticker-line${i === idx ? " active" : ""}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function RailDeco({ side }: { side: "start" | "end" }) {
  const balls = side === "start" ? [7, 14, 23, 31, 37, 42] : [3, 11, 19, 28, 33, 40];
  return (
    <div className="promo-side-rail-deco" aria-hidden>
      <div className="promo-side-rail-deco-orbit">
        <MandelesLogoMark size="sm" showText={false} />
      </div>
      <div className="promo-side-rail-deco-balls">
        {balls.map((n) => (
          <span key={n} className="promo-side-rail-ball">
            {n}
          </span>
        ))}
      </div>
      <div className="promo-side-rail-stats">
        {RAIL_STATS[side].map((s) => (
          <div key={s.l} className="promo-side-rail-stat">
            <strong>{s.n}</strong>
            <small>{s.l}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromoRailColumn({ side }: { side: "start" | "end" }) {
  const cards = RAIL_CARDS[side];
  return (
    <aside className={`promo-side-rail promo-side-rail--${side}`} aria-label="מבצעים בצד">
      <div className="promo-side-rail-crown">
        <span className="promo-side-rail-crown-glow" aria-hidden />
        <MandelesLogoMark size="sm" showText={false} />
        <span className="promo-side-rail-crown-title">Mandeles</span>
        <span className="promo-side-rail-crown-tag">לוטו חכם</span>
      </div>

      {cards.map((c) => (
        <RailCard key={c.title} {...c} />
      ))}

      <div className="promo-side-rail-body">
        <RailTicker side={side} />
        <RailDeco side={side} />
      </div>

      <div className="promo-side-rail-footer">
        <Link href={side === "start" ? "/lotto" : "/profile"} className="promo-side-rail-cta">
          {side === "start" ? "התחל לשחק ←" : "לאזור האישי ←"}
        </Link>
        <div className="promo-side-rail-badge">
          <span>18+</span>
          <small>הימורים באחריות</small>
        </div>
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
