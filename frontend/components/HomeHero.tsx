"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function HomeHero() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={{ textAlign: "center", padding: "60px 0 40px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎯</div>
      <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "clamp(1.8rem,5vw,3rem)", fontWeight: 900, color: "var(--cream)", lineHeight: 1.2, marginBottom: 14 }}>
        מנדל לוטו<br />
        <span style={{ color: "var(--gold)" }}>200 סטים. מילוי מקצועי. הגשה אישית.</span>
      </h1>
      <p style={{ fontSize: ".95rem", color: "var(--muted)", maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.7 }}>
        קבל 200 סטים מחושבים לכל הגרלה, מלא טפסים בקלות ואנחנו נגיש אותם לדוכן לוטו בשמך.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/lotto" className="btn btn-gold" style={{ fontSize: ".95rem", padding: "12px 28px" }}>🎱 התחל עכשיו</Link>
        {!isAuthenticated && (
          <Link href="/auth" className="btn btn-outline" style={{ fontSize: ".95rem", padding: "12px 28px" }}>כניסה / הרשמה</Link>
        )}
      </div>
    </section>
  );
}
