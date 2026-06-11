"use client";

import Link from "next/link";

export default function HomeHero() {
  return (
    <section className="winner-hero" aria-label="מבצע ראשי">
      <div className="winner-hero-bg" aria-hidden />
      <div className="winner-hero-inner">
        <div>
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
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
