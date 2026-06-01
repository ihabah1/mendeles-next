"use client";
import Link from "next/link";

const PLANS = [
  {
    title: "כיסוי מקסימלי",
    desc: "200 צירופים מאושרים",
    icon: "📊",
  },
  {
    title: "סטטיסטיקה חזקה",
    desc: "Hot Numbers היסטוריים",
    icon: "🔥",
  },
  {
    title: "גיוון עשריות",
    desc: "פיזור מקסימלי",
    icon: "🎯",
  },
];

export default function PremiumSection() {
  return (
    <section style={{ margin: "32px 0" }}>
      <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.2rem", fontWeight: 900, color: "var(--cream)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>⭐</span> אסטרטגיות מתקדמות – Premium
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {PLANS.map(p => (
          <div
            key={p.title}
            style={{
              background: "rgba(26,45,66,.85)",
              border: "1px solid var(--navy-b)",
              borderTop: "3px solid var(--gold)",
              borderRadius: 12,
              padding: "18px 16px",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: 10, left: 12, background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 20, padding: "2px 10px", fontSize: ".62rem", fontWeight: 700, color: "var(--gold)", display: "flex", alignItems: "center", gap: 4 }}>
              🔒 Premium
            </div>
            <div style={{ fontSize: "1.6rem", marginBottom: 8, marginTop: 8 }}>{p.icon}</div>
            <div style={{ fontWeight: 800, color: "var(--cream)", fontSize: ".92rem", marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: ".74rem", color: "var(--muted)", marginBottom: 14 }}>{p.desc}</div>
            <Link
              href="/auth?redirect=/lotto"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 9,
                border: "1px dashed rgba(201,168,76,.45)",
                background: "rgba(201,168,76,.06)",
                color: "var(--gold)",
                fontFamily: "Heebo,sans-serif",
                fontSize: ".78rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              🔒 רכוש גישה
            </Link>
            <div style={{ fontSize: ".65rem", color: "var(--muted)", textAlign: "center", marginTop: 10 }}>
              ⏳ תקף עד ההגרלה הבאה
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
