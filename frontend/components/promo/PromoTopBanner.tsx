"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MandelesLogoMark from "./MandelesLogoMark";
import { PremiumCrown, PremiumDiamond, PremiumSparkles } from "./PremiumBannerDecor";

const SLIDES = [
  {
    id: "premium",
    badge: "מועדון פרימיום",
    title: "מבצעים בלעדיים לחברי מועדון פרימיום",
    sub: "אלגוריתם מנדל · 200 צירופים · הגשה בשמך לדוכן",
    cta: "הצטרף למועדון",
    href: "/lotto",
  },
  {
    id: "lotto",
    badge: "שירות שליחות",
    title: "ניתוח סטטיסטי והגשת טפסי לוטו",
    sub: "מילוי טפסים · הדפסה · הגשה לדוכן מפעל הפיס",
    cta: "למילוי טפסים",
    href: "/lotto",
  },
  {
    id: "track",
    badge: "מעקב מלא",
    title: "מעקב מהזמנה ועד הסריקה",
    sub: "הדפסה · הגשה · עדכון זכיות לארנק",
    cta: "לאזור האישי",
    href: "/profile",
  },
] as const;

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
    <section className="premium-banner premium-banner--compact" aria-label="מבצעים">
      <div className="premium-banner-bg" aria-hidden />
      <div className="premium-banner-pattern" aria-hidden />
      <PremiumSparkles count={20} />

      <div className="premium-banner-inner">
        <PremiumCrown className="premium-banner-crown--sm" />

        <div className="premium-banner-center">
          <div className="premium-banner-brand-row">
            <MandelesLogoMark size="sm" variant="club" />
          </div>

          <div className="premium-banner-stage">
            {SLIDES.map((s, i) => (
              <div
                key={s.id}
                className={`premium-banner-slide${i === active ? " active" : ""}`}
                aria-hidden={i !== active}
              >
                <span className="premium-banner-badge">{s.badge}</span>
                <p className="premium-banner-title">{s.title}</p>
                <p className="premium-banner-sub">{s.sub}</p>
              </div>
            ))}
          </div>

          <Link href={slide.href} className="premium-banner-cta">
            {slide.cta}
            <span className="premium-banner-cta-arrow" aria-hidden>←</span>
          </Link>
        </div>

        <PremiumDiamond className="premium-banner-diamond--sm" />
      </div>

      <div className="premium-banner-controls">
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label="שקף קודם"
          onClick={() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        >
          ›
        </button>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`premium-banner-dot${i === active ? " active" : ""}`}
            aria-label={`שקף ${i + 1}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => setActive(i)}
          />
        ))}
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label={paused ? "המשך" : "השהה"}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▶" : "⏸"}
        </button>
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label="שקף הבא"
          onClick={() => setActive((i) => (i + 1) % SLIDES.length)}
        >
          ‹
        </button>
      </div>
    </section>
  );
}
