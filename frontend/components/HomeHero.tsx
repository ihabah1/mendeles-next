"use client";

import Link from "next/link";

const BALLS = [
  { n: 7, left: "8%", delay: "0s", dur: "6.5s", size: 34 },
  { n: 13, left: "20%", delay: "1.2s", dur: "7.5s", size: 28 },
  { n: 21, left: "33%", delay: "0.5s", dur: "6s", size: 38 },
  { n: 34, left: "48%", delay: "2s", dur: "8s", size: 26 },
  { n: 6, left: "62%", delay: "0.8s", dur: "7s", size: 32 },
  { n: 29, left: "76%", delay: "1.6s", dur: "6.8s", size: 30 },
  { n: 3, left: "89%", delay: "0.3s", dur: "7.8s", size: 36 },
] as const;

export default function HomeHero() {
  return (
    <section className="winner-hero" aria-label="מבצע ראשי">
      <div className="winner-hero-bg" aria-hidden />
      <div className="winner-hero-shine" aria-hidden />
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
        <div className="winner-hero-text">
          <h1 className="winner-hero-title">
            לוטו חכם עם 200 סטים
          </h1>
          <p className="winner-hero-sub">
            מילוי מקצועי · הגשה אישית לפיס · מעקב עד הסריקה
          </p>
          <p className="winner-hero-note" style={{ marginTop: 8 }}>
            *הסטים מחושבים לפי אלגוריתם מנדל — פיזור מקסימלי
          </p>
        </div>
        <Link href="/lotto" className="winner-hero-cta">
          בוא להרוויח
          <span className="winner-hero-cta-arrow" aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
