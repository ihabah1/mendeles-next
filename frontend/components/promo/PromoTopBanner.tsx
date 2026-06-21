"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MandelesLogoMark from "./MandelesLogoMark";

const BALLS = [
  { n: 7, left: "6%", delay: "0s", dur: "6.5s", size: 26 },
  { n: 21, left: "28%", delay: "0.6s", dur: "7s", size: 22 },
  { n: 13, left: "52%", delay: "1.4s", dur: "6.8s", size: 24 },
  { n: 29, left: "74%", delay: "0.2s", dur: "7.4s", size: 20 },
  { n: 6, left: "90%", delay: "1s", dur: "6.2s", size: 22 },
] as const;

const SLIDES = [
  {
    id: "lotto",
    theme: "red",
    badge: "שירות שליחות",
    titleMain: "ניתוח סטטיסטי",
    titleAccent: "ו-200 צירופים",
    sub: "מילוי טפסים · הגשה בשמך לדוכן מפעל הפיס",
    cta: "למילוי טפסים",
    href: "/lotto",
    emoji: "📋",
  },
  {
    id: "premium",
    theme: "green",
    badge: "פרימיום",
    titleMain: "אלגוריתם מנדל",
    titleAccent: "— פיזור סטטיסטי",
    sub: "צירופים ייחודיים לכל מנוי · ללא הבטחת זכייה",
    cta: "למנוי פרימיום",
    href: "/lotto",
    emoji: "💎",
  },
  {
    id: "track",
    theme: "purple",
    badge: "מעקב",
    titleMain: "מעקב מלא",
    titleAccent: "— עד הסריקה",
    sub: "הדפסה · הגשה לדוכן · עדכון זכיות לארנק",
    cta: "לאזור האישי",
    href: "/profile",
    emoji: "🏆",
  },
] as const;

const CONFETTI_COLORS = ["#ffcc00", "#2ed06a", "#8ec8ff", "#ff6b7a", "#ffffff", "#ff9933", "#a85cd6"];

function BannerConfetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.6 + 1.2) % 100}%`,
    delay: `${(i * 0.28) % 3.5}s`,
    dur: `${3.2 + (i % 4) * 0.5}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 4 + (i % 3) * 2,
    h: 8 + (i % 4) * 2,
  }));

  return (
    <div className="promo-top-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="promo-top-confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            width: p.w,
            height: p.h,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

function BannerBalls() {
  return (
    <div className="promo-top-balls" aria-hidden>
      {BALLS.map((b) => (
        <span
          key={b.n}
          className="promo-top-ball"
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

export default function PromoTopBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section
      className={`promo-top-banner promo-top-banner--${slide.theme}`}
      aria-label="מבצעים"
    >
      <div className="promo-top-banner-bg" aria-hidden />
      <div className="promo-top-banner-shine" aria-hidden />
      <BannerConfetti />
      <BannerBalls />

      <div className="promo-top-banner-inner">
        <div className="promo-top-banner-brand">
          <MandelesLogoMark size="sm" />
        </div>

        <span className="promo-top-emoji" aria-hidden key={`emoji-${slide.id}`}>
          {slide.emoji}
        </span>

        <div className="promo-top-banner-stage">
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              className={`promo-top-slide${i === active ? " active" : ""}`}
              aria-hidden={i !== active}
            >
              <span className="promo-top-badge">{s.badge}</span>
              <p className="promo-top-headline">
                <span className="promo-top-headline-main">{s.titleMain}</span>
                <span className="promo-top-headline-accent"> {s.titleAccent}</span>
              </p>
              <p className="promo-top-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        <Link href={slide.href} className="promo-top-cta">
          {slide.cta}
          <span className="promo-top-cta-arrow" aria-hidden>→</span>
        </Link>

        <div className="promo-top-controls">
          <button
            type="button"
            className="promo-top-ctrl"
            aria-label="שקף קודם"
            onClick={() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="promo-top-ctrl"
            aria-label={paused ? "המשך" : "השהה"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "▶" : "⏸"}
          </button>
          <button
            type="button"
            className="promo-top-ctrl"
            aria-label="שקף הבא"
            onClick={() => setActive((i) => (i + 1) % SLIDES.length)}
          >
            ›
          </button>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`promo-top-dot${i === active ? " active" : ""}`}
              aria-label={`שקף ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
