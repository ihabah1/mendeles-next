"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

const PLANS = [
  { title: "כיסוי מקסימלי", desc: "200 צירופים מאושרים" },
  { title: "סטטיסטיקה חזקה", desc: "Hot Numbers היסטוריים" },
  { title: "גיוון עשריות", desc: "פיזור מקסימלי" },
];

export default function PremiumSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={{ margin: "32px auto", maxWidth: 420 }}>
      <h2
        style={{
          fontFamily: "'Frank Ruhl Libre',serif",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "var(--cream)",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden>⭐</span>
        <span>אסטרטגיות מתקדמות – Premium</span>
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PLANS.map(p => (
          <article
            key={p.title}
            style={{
              background: "rgba(26,45,66,.92)",
              border: "1px solid var(--navy-b)",
              borderTop: "3px solid var(--gold)",
              borderRadius: 14,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 6px 24px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ padding: "18px 16px 14px" }}>
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: "rgba(201,168,76,.12)",
                  border: "1px solid rgba(201,168,76,.35)",
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: ".62rem",
                  fontWeight: 700,
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span aria-hidden>🔒</span> Premium
              </div>

              <div style={{ paddingTop: 28, textAlign: "right" }}>
                <h3 style={{ fontWeight: 800, color: "var(--cream)", fontSize: ".95rem", marginBottom: 6 }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: ".76rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
                  {p.desc}
                </p>
              </div>

              <Link
                href={isAuthenticated ? "/lotto" : "/auth?redirect=/lotto"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  border: "1px dashed rgba(201,168,76,.45)",
                  background: "rgba(13,27,42,.6)",
                  color: "var(--gold)",
                  fontFamily: "Heebo,sans-serif",
                  fontSize: ".78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <span aria-hidden>🔒</span> רכוש גישה
              </Link>
            </div>

            <div
              style={{
                background: "rgba(13,27,42,.75)",
                borderTop: "1px solid var(--navy-b)",
                padding: "10px 16px",
                fontSize: ".68rem",
                color: "var(--gold)",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span aria-hidden>⏳</span>
              <span>תקף עד ההגרלה הבאה</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
