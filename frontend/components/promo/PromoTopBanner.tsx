"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MandelesLogoMark from "./MandelesLogoMark";

const SLIDES = [
  {
    headline: "לוטו חכם עם 200 סטים",
    sub: "מילוי מקצועי · הגשה אישית לפיס",
    cta: "התחל עכשיו",
    href: "/lotto",
    accent: "#ffcc00",
  },
  {
    headline: "אלגוריתם מנדל — פיזור מקסימלי",
    sub: "סטים ייחודיים לכל לקוח פרימיום",
    cta: "למנוי פרימיום",
    href: "/lotto",
    accent: "#7ee8a8",
  },
  {
    headline: "מעקב הזמנה עד הסריקה",
    sub: "הדפסה · הגשה · עדכון זכיות לארנק",
    cta: "לאזור האישי",
    href: "/profile",
    accent: "#8ec8ff",
  },
] as const;

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${(i * 5.7 + 3) % 100}%`,
    delay: `${(i * 0.35) % 3}s`,
    color: ["#ffcc00", "#e8c060", "#7ee8a8", "#ff6b7a", "#8ec8ff"][i % 5],
    size: 4 + (i % 3) * 2,
  }));

  return (
    <div className="promo-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="promo-confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            background: p.color,
            width: p.size,
            height: p.size * 1.4,
          }}
        />
      ))}
    </div>
  );
}

export default function PromoTopBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5200);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section className="promo-top-banner" aria-label="מבצעים">
      <Confetti />
      <div className="promo-top-banner-inner">
        <div className="promo-top-banner-brand">
          <MandelesLogoMark size="sm" />
        </div>

        <div className="promo-top-banner-stage">
          {SLIDES.map((s, i) => (
            <div
              key={s.headline}
              className={`promo-top-slide${i === active ? " active" : ""}`}
              aria-hidden={i !== active}
            >
              <p className="promo-top-headline">{s.headline}</p>
              <p className="promo-top-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        <Link href={slide.href} className="promo-top-cta">
          {slide.cta}
        </Link>

        <div className="promo-top-controls">
          <button
            type="button"
            className="promo-top-ctrl"
            aria-label={paused ? "המשך" : "השהה"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "▶" : "⏸"}
          </button>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`promo-top-dot${i === active ? " active" : ""}`}
              aria-label={`שקף ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      </div>
      <div className="promo-top-banner-glow" style={{ background: slide.accent }} aria-hidden />
    </section>
  );
}
