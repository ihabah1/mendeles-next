"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";
import { PremiumCrown, PremiumDiamond, PremiumSparkles } from "@/components/promo/PremiumBannerDecor";

const SLIDES = [
  {
    id: "premium",
    badge: "מועדון פרימיום",
    title: "מבצעים בלעדיים לחברי מועדון פרימיום",
    sub: "אלגוריתם מנדל · 200 צירופים · הגשה בשמך לדוכן",
    note: "*אין הבטחה לזכייה · איננו קשורים למפעל הפיס",
    cta: "הצטרף למועדון",
    href: "/lotto",
  },
  {
    id: "lotto",
    badge: "שירות שליחות",
    title: "ניתוח סטטיסטי והגשת טפסים",
    sub: "200 צירופים בפיזור סטטיסטי · מילוי · הגשה בשמך לדוכן",
    note: "*אין הבטחה לזכייה · איננו קשורים למפעל הפיס",
    cta: "למילוי טפסים",
    href: "/lotto",
  },
  {
    id: "track",
    badge: "מעקב מלא",
    title: "מעקב מלא — עד הסריקה",
    sub: "הדפסה · הגשה לדוכן · עדכון זכיות לארנק",
    note: "*הכרטיס נרכש על שמך · תקבל צילום הטופס",
    cta: "לאזור האישי",
    href: "/profile",
  },
] as const;

export default function HomeHero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <section className="premium-banner premium-banner--hero" aria-label="מבצע ראשי">
      <div className="premium-banner-bg" aria-hidden />
      <div className="premium-banner-pattern" aria-hidden />
      <PremiumSparkles count={36} />

      <div className="premium-banner-inner premium-banner-inner--hero">
        <PremiumCrown />

        <div className="premium-banner-center">
          <div className="premium-banner-brand-row premium-banner-brand-row--hero">
            <MandelesLogoMark size="lg" variant="club" />
          </div>

          <div className="premium-banner-stage premium-banner-stage--hero">
            {SLIDES.map((s, i) => (
              <div
                key={s.id}
                className={`premium-banner-slide${i === active ? " active" : ""}`}
                aria-hidden={i !== active}
              >
                <span className="premium-banner-badge">{s.badge}</span>
                <h1 className="premium-banner-title premium-banner-title--hero">{s.title}</h1>
                <p className="premium-banner-sub">{s.sub}</p>
                <p className="premium-banner-note">{s.note}</p>
              </div>
            ))}
          </div>

          <Link href={slide.href} className="premium-banner-cta premium-banner-cta--hero">
            {slide.cta}
            <span className="premium-banner-cta-arrow" aria-hidden>←</span>
          </Link>
        </div>

        <PremiumDiamond />
      </div>

      <div className="premium-banner-controls premium-banner-controls--hero">
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label="הקודם"
          onClick={() => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        >
          ›
        </button>
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label={paused ? "המשך" : "השהה"}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▶" : "❚❚"}
        </button>
        <button
          type="button"
          className="premium-banner-ctrl"
          aria-label="הבא"
          onClick={() => setActive((i) => (i + 1) % SLIDES.length)}
        >
          ‹
        </button>
        <span className="premium-banner-dots" aria-hidden>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`premium-banner-dot${i === active ? " active" : ""}`}
              aria-label={`שקף ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </span>
      </div>
    </section>
  );
}
