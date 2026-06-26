"use client";

import Link from "next/link";
import MandelesLogoMark from "@/components/promo/MandelesLogoMark";

const SERVICES = [
  {
    icon: "📄",
    title: "הצעת מחיר",
    desc: "יצירה מהירה עם לוגו, פירוט פריטים וסכום — מוכן לשליחה ללקוח",
    href: "/dashboard",
    docType: "quote",
  },
  {
    icon: "🏠",
    title: "סיכום ביקור",
    desc: "תיעוד ביקור אצל לקוח — ממצאים, המלצות ופעולות המשך",
    href: "/dashboard",
    docType: "visit_summary",
  },
  {
    icon: "📞",
    title: "סיכום שיחה",
    desc: "סיכום שיחה או פגישה — נקודות עיקריות, החלטות ומשימות",
    href: "/dashboard",
    docType: "call_summary",
  },
  {
    icon: "✍️",
    title: "חתימה דיגיטלית",
    desc: "שליחת קישור לחתימה מהנייד — מעקב סטטוס עד לחתימה",
    href: "/dashboard",
  },
  {
    icon: "🤖",
    title: "מילוי אוטומטי עם AI",
    desc: "תיאור חופשי → שדות מובנים במסמך, חוסך זמן יקר",
    href: "/dashboard",
  },
  {
    icon: "💬",
    title: "סוכן WhatsApp",
    desc: "מענה ללקוחות, סטטוס מסמך והדרכה ליצירת מסמך — דרך Twilio",
    href: "/dashboard",
  },
] as const;

const AUDIENCES = [
  "עורכי דין",
  "סוכני נדל״ן",
  "רואי חשבון",
  "קבלנים",
  "אינסטלטורים",
  "שיפוצניקים",
  "גננים",
  "ועוד",
];

export default function DocumentsHomeHero() {
  return (
    <section className="docs-hero">
      <div className="docs-hero-inner">
        <div className="docs-hero-badge">מנדלס לעסקים</div>
        <MandelesLogoMark size="lg" variant="club" />
        <h1 className="docs-hero-title">
          מסמכים חכמים, חתימה דיגיטלית
          <br />
          <span className="docs-hero-accent">ומעקב — הכל במקום אחד</span>
        </h1>
        <p className="docs-hero-sub">
          יצירת PDF מקצועי עם לוגו, מילוי אוטומטי עם AI, שליחה לחתימה ומעקב סטטוס —
          לעסקים קטנים ובינוניים בישראל.
        </p>
        <div className="docs-hero-cta">
          <Link href="/auth" className="docs-btn docs-btn--primary">
            התחל בחינם
          </Link>
          <Link href="/dashboard" className="docs-btn docs-btn--secondary">
            לאזור המסמכים
          </Link>
        </div>
        <div className="docs-hero-audiences">
          {AUDIENCES.map((a) => (
            <span key={a} className="docs-audience-pill">
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DocumentsServicesGrid() {
  return (
    <section className="home-section docs-services">
      <h2 className="home-section-title">
        <span aria-hidden>📋</span>
        <span>מכלול השירותים</span>
      </h2>
      <div className="docs-services-grid">
        {SERVICES.map((s) => (
          <Link key={s.title} href={s.href} className="docs-service-card">
            <div className="docs-service-icon">{s.icon}</div>
            <div className="docs-service-title">
              {s.title}
              {"soon" in s && s.soon ? <span className="docs-soon-badge">בקרוב</span> : null}
            </div>
            <p className="docs-service-desc">{s.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DocumentsHowItWorks() {
  const steps = [
    { n: "1", title: "בחר תבנית", desc: "הצעת מחיר, סיכום ביקור או סיכום שיחה" },
    { n: "2", title: "AI ממלא", desc: "תאר במילים — המערכת ממלאת את השדות" },
    { n: "3", title: "שלח לחתימה", desc: "קישור SMS או מייל ללקוח" },
    { n: "4", title: "עקוב", desc: "טיוטה → נשלח → נצפה → נחתם" },
  ];
  return (
    <section className="home-section docs-how">
      <h2 className="home-section-title">
        <span aria-hidden>⚡</span>
        <span>איך זה עובד?</span>
      </h2>
      <div className="docs-steps">
        {steps.map((s) => (
          <div key={s.n} className="docs-step">
            <div className="docs-step-num">{s.n}</div>
            <div className="docs-step-title">{s.title}</div>
            <div className="docs-step-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
