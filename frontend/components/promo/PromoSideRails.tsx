"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccessDevGames } from "@/lib/lotto-only";
import MandelesLogoMark from "./MandelesLogoMark";

type RailCard = {
  icon: string;
  title: string;
  lines: readonly string[];
  href: string;
  variant: string;
  badge?: string;
};

const RAIL_CARDS_DOCS: Record<"start" | "end", RailCard[]> = {
  start: [
    {
      icon: "📄",
      title: "הצעת מחיר",
      lines: ["PDF עם לוגו", "מילוי אוטומטי עם AI"],
      href: "/dashboard",
      variant: "gold",
      badge: "שירות",
    },
    {
      icon: "✍️",
      title: "חתימה דיגיטלית",
      lines: ["שליחה ללקוח", "מעקב סטטוס"],
      href: "/dashboard",
      variant: "green",
      badge: "מהיר",
    },
    {
      icon: "📋",
      title: "סיכום ביקור",
      lines: ["תיעוד מקצועי", "שליחה מיידית"],
      href: "/dashboard",
      variant: "purple",
    },
  ],
  end: [
    {
      icon: "👤",
      title: "ניהול חשבון",
      lines: ["פרטי עסק ולוגו", "הגדרות אישיות"],
      href: "/profile/details",
      variant: "navy",
    },
    {
      icon: "🏆",
      title: "הטבות ומתנות",
      lines: ["מבצעים לחברים", "הטבות בלעדיות"],
      href: "/promotions",
      variant: "red",
      badge: "חם",
    },
    {
      icon: "💳",
      title: "ניהול תשלומים",
      lines: ["טעינת ארנק", "היסטוריית תשלומים"],
      href: "/profile/topup",
      variant: "teal",
    },
    {
      icon: "🧾",
      title: "חשבונית מס",
      lines: ["הורדת חשבוניות", "מסמכים רשמיים"],
      href: "/profile/orders",
      variant: "gold",
    },
  ],
};

const RAIL_CARDS_LOTTO: Record<"start" | "end", RailCard[]> = {
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
};

const RAIL_TICKERS_DOCS = {
  start: [
    "📄 PDF מקצועי עם לוגו",
    "🤖 מילוי אוטומטי עם AI",
    "✍️ חתימה דיגיטלית מהירה",
    "📊 מעקב סטטוס בזמן אמת",
    "🔒 מאובטח ופרטי",
  ],
  end: [
    "👤 ניהול חשבון עסקי",
    "🧾 חשבוניות ומסמכים",
    "💳 תשלומים מאובטחים",
    "📲 עדכונים ב-SMS",
    "🔒 הצפנה מתקדמת",
  ],
} as const;

const RAIL_TICKERS_LOTTO = {
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

const RAIL_STATS_DOCS = {
  start: [
    { n: "3", l: "תבניות" },
    { n: "AI", l: "מילוי" },
    { n: "PDF", l: "מיידי" },
  ],
  end: [
    { n: "24/7", l: "מעקב" },
    { n: "100%", l: "מאובטח" },
    { n: "✓", l: "חתימה" },
  ],
} as const;

const RAIL_STATS_LOTTO = {
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

const CONFETTI_COLORS = ["#f0b048", "#30c49a", "#e4567a", "#8ec8ff", "#ffffff", "#ffb060"];

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
}: RailCard & { index?: number }) {
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

function RailTicker({ side, landing }: { side: "start" | "end"; landing: boolean }) {
  const items = landing ? RAIL_TICKERS_DOCS[side] : RAIL_TICKERS_LOTTO[side];
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

function RailDeco({ side, landing }: { side: "start" | "end"; landing: boolean }) {
  const stats = landing ? RAIL_STATS_DOCS[side] : RAIL_STATS_LOTTO[side];
  const balls = side === "start" ? [7, 14, 23, 31, 37, 42] : [3, 11, 19, 28, 33, 40];
  return (
    <div className="promo-side-rail-deco" aria-hidden>
      <div className="promo-side-rail-deco-orbit">
        <MandelesLogoMark size="sm" showText={false} />
      </div>
      <div className="promo-side-rail-deco-balls">
        {balls.map((n, i) => (
          <span key={n} className="promo-side-rail-ball" style={{ animationDelay: `${i * 0.25}s` }}>
            {n}
          </span>
        ))}
      </div>
      <div className="promo-side-rail-stats">
        {stats.map((s) => (
          <div key={s.l} className="promo-side-rail-stat">
            <strong>{s.n}</strong>
            <small>{s.l}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PromoRailColumn({ side, landing = false }: { side: "start" | "end"; landing?: boolean }) {
  const { isStaff } = useAuth();
  const showDev = canAccessDevGames(isStaff);
  const source = landing ? RAIL_CARDS_DOCS : RAIL_CARDS_LOTTO;
  const cards = source[side].filter((c) => showDev || !c.href.startsWith("/seven77"));

  return (
    <aside className={`promo-side-rail promo-side-rail--${side}`} aria-label="שירותים בצד">
      <RailConfetti count={20} tall />
      <RailFloatBalls />

      <div className="promo-side-rail-crown">
        <RailConfetti count={14} />
        <span className="promo-side-rail-crown-shine" aria-hidden />
        <span className="promo-side-rail-crown-glow" aria-hidden />
        <MandelesLogoMark size="sm" showText={false} />
        <span className="promo-side-rail-crown-title">MANDELES</span>
        <span className="promo-side-rail-crown-tag">PREMIUM CLUB</span>
      </div>

      {cards.map((c, i) => (
        <RailCard key={c.title} {...c} index={i} />
      ))}

      <div className="promo-side-rail-body">
        <RailTicker side={side} landing={landing} />
        <RailDeco side={side} landing={landing} />
      </div>

      <div className="promo-side-rail-footer">
        <Link
          href={side === "start" ? (landing ? "/dashboard" : "/lotto") : "/profile"}
          className="promo-side-rail-cta"
        >
          {side === "start" ? (landing ? "ליצירת מסמך" : "למילוי טפסים") : "לאזור האישי"}
          <span className="promo-side-rail-cta-arrow" aria-hidden>←</span>
        </Link>
        <div className="promo-side-rail-badge">
          <span>{landing ? "B2B" : "18+"}</span>
          <small>{landing ? "לעסקים" : "הימורים באחריות"}</small>
        </div>
      </div>
    </aside>
  );
}

export default function PromoSideRails() {
  return (
    <>
      <PromoRailColumn side="start" landing />
      <PromoRailColumn side="end" landing />
    </>
  );
}
