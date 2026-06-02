"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HomeHero() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showLogin = mounted && !loading && !user;

  return (
    <section className="home-section" style={{ textAlign: "center", padding: "8px 0 4px" }}>
      <div style={{ fontSize: "2.2rem", marginBottom: 10, lineHeight: 1 }}>🎯</div>
      <h1
        style={{
          fontFamily: "'Frank Ruhl Libre',serif",
          fontSize: "clamp(1.6rem,4.5vw,2.4rem)",
          fontWeight: 900,
          color: "var(--cream)",
          lineHeight: 1.25,
          marginBottom: 10,
        }}
      >
        מנדל לוטו
        <span style={{ display: "block", color: "var(--gold)", fontSize: "0.72em", marginTop: 6 }}>
          200 סטים · מילוי מקצועי · הגשה אישית
        </span>
      </h1>
      <p
        style={{
          fontSize: "0.88rem",
          color: "var(--muted)",
          maxWidth: 460,
          margin: "0 auto 22px",
          lineHeight: 1.65,
        }}
      >
        קבל 200 סטים מחושבים לכל הגרלה, מלא טפסים בקלות ואנחנו נגיש אותם לדוכן לוטו בשמך.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/lotto" className="btn btn-gold" style={{ fontSize: "0.88rem", padding: "11px 24px" }}>
          🎱 התחל עכשיו
        </Link>
        {showLogin ? (
          <Link href="/auth" className="btn btn-outline" style={{ fontSize: "0.88rem", padding: "11px 24px" }}>
            כניסה / הרשמה
          </Link>
        ) : null}
      </div>
    </section>
  );
}
