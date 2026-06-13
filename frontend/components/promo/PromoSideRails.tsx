"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MandelesLogoMark from "./MandelesLogoMark";

const RAIL_CARDS = {
  start: [
    {
      icon: "🎱",
      title: "לוטו — שירות שליחות",
      lines: ["200 צירופים סטטיסטיים", "מילוי והגשה בשמך"],
      href: "/lotto",
      variant: "gold",
      badge: "שירות",
    },
    {
      icon: "⚡",
      title: "הזמנה מהירה",
      lines: ["בחר טבלאות", "שלח לתור הדפסה"],
      href: "/lotto",
      variant: "green",
      badge: "מהיר",
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
      badge: "חם",
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
    "📋 ניתוח סטטיסטי",
    "🚗 הגשה בשם הלקוח",
    "📸 צילום טופס לאחר רכישה",
    "⚖️ איננו קשורים למפעל הפיס",
    "🔒 תשלום מאובטח",
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

const CONFETTI_COLORS = ["#ffcc00", "#2ed06a", "#ff6b7a", "#8ec8ff", "#ffffff", "#ff9933"];

function RailConfetti({ count = 12, tall = false }: { count?: number; tall?: boolean }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * (100 / count) + 2) % 100}%`,
    delay: `${(i * 0.35) % 3.5}s`,
    dur: `${2.4 + (i % 4) * 0.5}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 3 + (i % 3),
    sway: i % 2 === 0 ? "promo-rail-confetti-fall" : "promo-rail-confetti-sway",
  }));
  return (
    <div className={`promo-rail-confetti${tall ? " promo-rail-confetti--tall" : ""}`} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="promo-rail-confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            width: p.size,
            height: p.size * 1.5,
            animationName: p.sway,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

const FLOAT_BALLS = [
  { n: 3, left: "12%", delay: "0s", dur: "5.5s", size: 14 },
  { n: 17, left: "78%", delay: "1.1s", dur: "6.2s", size: 12 },
  { n: 29, left: "45%", delay: "0.6s", dur: "5.8s", size: 16 },
  { n: 7, left: "88%", delay: "2s", dur: "6.8s", size: 11 },
] as const;

function RailFloatBalls() {
  return (
    <div className="promo-rail-float-balls" aria-hidden>
      {FLOAT_BALLS.map((b) => (
        <span
          key={b.n}
          className="promo-rail-float-ball"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            fontSize: b.size * 0.42,
            animationDelay: b.delay,
            animationDuration: b.dur,
          }}
        >
          {b.n}
        </span>
      ))}
    </div>
  );
}

function RailCard({
  icon,
  title,
  lines,
  href,
  variant,
  badge,
  index = 0,
}: {
  icon: string;
  title: string;
  lines: readonly string[];
  href: string;
  variant: string;
  badge?: string;
  index?: number;
}) {
  return (
    <Link
      href={href}
      className={`promo-rail-card promo-rail-card--${variant}`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <span className="promo-rail-card-shine" aria-hidden />
      {badge && <span className="promo-rail-card-badge">{badge}</span>}
      <span className="promo-rail-card-icon" aria-hidden style={{ animationDelay: `${index * 0.2}s` }}>
        {icon}
      </span>
      <span className="promo-rail-card-title">{title}</span>
      {lines.map((line) => (
        <span key={line} className="promo-rail-card-line">
          {line}
        </span>
      ))}
      <span className="promo-rail-card-cta">
        לחץ כאן <span className="promo-rail-card-cta-arrow" aria-hidden>←</span>
      </span>
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
        {balls.map((n, i) => (
          <span
            key={n}
            className="promo-side-rail-ball"
            style={{ animationDelay: `${i * 0.25}s` }}
          >
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
      <RailConfetti count={20} tall />
      <RailFloatBalls />

      <div className="promo-side-rail-crown">
        <RailConfetti count={14} />
        <span className="promo-side-rail-crown-shine" aria-hidden />
        <span className="promo-side-rail-crown-glow" aria-hidden />
        <MandelesLogoMark size="sm" showText={false} />
        <span className="promo-side-rail-crown-title">Mandeles</span>
        <span className="promo-side-rail-crown-tag">ניתוח ושליחות</span>
      </div>

      {cards.map((c, i) => (
        <RailCard key={c.title} {...c} index={i} />
      ))}

      <div className="promo-side-rail-body">
        <RailTicker side={side} />
        <RailDeco side={side} />
      </div>

      <div className="promo-side-rail-footer">
        <Link href={side === "start" ? "/lotto" : "/profile"} className="promo-side-rail-cta">
          {side === "start" ? "למילוי טפסים" : "לאזור האישי"}
          <span className="promo-side-rail-cta-arrow" aria-hidden>←</span>
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
