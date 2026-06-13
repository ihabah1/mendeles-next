"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

const PLANS = [
  { title: "פיזור סטטיסטי", desc: "200 צירופים מאושרים", icon: "🎯" },
  { title: "נתוני עבר", desc: "ניתוח תוצאות היסטוריות", icon: "📊" },
  { title: "גיוון צירופים", desc: "פיזור על בסיס מודל פנימי", icon: "🔢" },
];

export default function PremiumSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="home-section">
      <h2 className="home-section-title">
        <span aria-hidden>⭐</span>
        <span>אסטרטגיות פרימיום — ללא הבטחת זכייה</span>
      </h2>

      <div className="home-grid-3">
        {PLANS.map(p => (
          <article
            key={p.title}
            className="home-card"
            style={{
              borderTop: "2px solid var(--gold)",
              padding: "16px 14px 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, paddingBottom: 12 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(201,168,76,.1)",
                  border: "1px solid rgba(201,168,76,.3)",
                  borderRadius: 16,
                  padding: "2px 8px",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "var(--gold)",
                  marginBottom: 10,
                }}
              >
                <span aria-hidden>🔒</span> Premium
              </div>
              <div style={{ fontSize: "1.1rem", marginBottom: 6 }}>{p.icon}</div>
              <h3 style={{ fontWeight: 800, color: "var(--cream)", fontSize: "0.85rem", marginBottom: 4 }}>
                {p.title}
              </h3>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>{p.desc}</p>
            </div>

            <Link
              href={isAuthenticated ? "/lotto" : "/auth?redirect=/lotto"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                margin: "0 -14px",
                padding: "9px 12px",
                borderTop: "1px solid var(--navy-b)",
                background: "rgba(13,27,42,.55)",
                color: "var(--gold)",
                fontFamily: "Heebo,sans-serif",
                fontSize: "0.72rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span aria-hidden>🔒</span> רכוש גישה
            </Link>
          </article>
        ))}
      </div>

      <p
        style={{
          marginTop: 10,
          fontSize: "0.65rem",
          color: "var(--muted)",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <span aria-hidden>⏳</span>
        תקף עד ההגרלה הבאה
      </p>
    </section>
  );
}
