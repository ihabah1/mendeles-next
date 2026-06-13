"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const BALLS = [
  { n: 7, left: "8%", delay: "0s", dur: "6.5s", size: 34 },
  { n: 13, left: "20%", delay: "1.2s", dur: "7.5s", size: 28 },
  { n: 21, left: "33%", delay: "0.5s", dur: "6s", size: 38 },
  { n: 34, left: "48%", delay: "2s", dur: "8s", size: 26 },
  { n: 6, left: "62%", delay: "0.8s", dur: "7s", size: 32 },
  { n: 29, left: "76%", delay: "1.6s", dur: "6.8s", size: 30 },
  { n: 3, left: "89%", delay: "0.3s", dur: "7.8s", size: 36 },
] as const;

const SLIDES = [
  {
    id: "lotto",
    theme: "red",
    badge: "שירות שליחות",
    title: "ניתוח סטטיסטי והגשת טפסים",
    sub: "200 צירופים בפיזור סטטיסטי · מילוי · הגשה בשמך לדוכן",
    note: "*אין הבטחה לזכייה · איננו קשורים למפעל הפיס",
    cta: "למילוי טפסים",
    href: "/lotto",
    emoji: "📋",
  },
  {
    id: "premium",
    theme: "green",
    badge: "פרימיום",
    title: "אלגוריתם מנדל — פיזור סטטיסטי",
    sub: "צירופים ייחודיים לכל מנוי · כיסוי מלא של 1–37",
    note: "*הפיזור אינו מגדיל את הסתברות הזכייה המתמטית",
    cta: "למנוי פרימיום",
    href: "/#pricing",
    emoji: "💎",
  },
  {
    id: "track",
    theme: "purple",
    badge: "מעקב",
    title: "מעקב מלא — עד הסריקה",
    sub: "הדפסה · הגשה לדוכן · עדכון זכיות לארנק",
    note: "*הכרטיס נרכש על שמך · תקבל צילום הטופס",
    cta: "לאזור האישי",
    href: "/profile",
    emoji: "🏆",
  },
] as const;

const CONFETTI_COLORS = ["#ffcc00", "#2ed06a", "#8ec8ff", "#ff6b7a", "#ffffff", "#ff9933", "#a85cd6"];

function HeroConfetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    left: `${(i * 2.83 + 1.4) % 100}%`,
    delay: `${(i * 0.31) % 4.2}s`,
    dur: `${3.6 + (i % 5) * 0.55}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 5 + (i % 3) * 2,
    h: 9 + (i % 4) * 3,
    sway: i % 2 === 0 ? "hero-confetti-fall" : "hero-confetti-fall-sway",
  }));

  return (
    <div className="hero-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="hero-confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            width: p.w,
            height: p.h,
            animationName: p.sway,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

export default function HomeHero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const prev = () => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setActive((i) => (i + 1) % SLIDES.length);
  const slide = SLIDES[active];

  return (
    <section className={`winner-hero winner-hero--${slide.theme}`} aria-label="מבצע ראשי">
      <div className="winner-hero-bg" aria-hidden />
      <div className="winner-hero-shine" aria-hidden />
      <HeroConfetti />
      <div className="winner-hero-balls" aria-hidden>
        {BALLS.map((b) => (
          <span
            key={b.n}
            className="winner-hero-ball"
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

      <div className="winner-hero-inner">
        <span className="winner-hero-emoji" aria-hidden key={`emoji-${slide.id}`}>
          {slide.emoji}
        </span>

        <div className="winner-hero-text" key={slide.id}>
          <span className="winner-hero-badge">{slide.badge}</span>
          <h1 className="winner-hero-title">{slide.title}</h1>
          <p className="winner-hero-sub">{slide.sub}</p>
          <p className="winner-hero-note" style={{ marginTop: 8 }}>{slide.note}</p>
        </div>

        <Link href={slide.href} className="winner-hero-cta">
          {slide.cta}
          <span className="winner-hero-cta-arrow" aria-hidden>→</span>
        </Link>
      </div>

      <div className="winner-hero-controls">
        <button type="button" className="winner-hero-ctrl" aria-label="הקודם" onClick={prev}>
          ‹
        </button>
        <button
          type="button"
          className="winner-hero-ctrl"
          aria-label={paused ? "המשך" : "השהה"}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▶" : "❚❚"}
        </button>
        <button type="button" className="winner-hero-ctrl" aria-label="הבא" onClick={next}>
          ›
        </button>
        <span className="winner-hero-dots" aria-hidden>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`winner-hero-dot${i === active ? " active" : ""}`}
              aria-label={`שקף ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </span>
      </div>
    </section>
  );
}
