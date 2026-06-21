"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccessDevGames } from "@/lib/lotto-only";

export default function RestrictedGamesGate({
  gameName,
  children,
}: {
  gameName: string;
  children: React.ReactNode;
}) {
  const { isStaff, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
        טוען...
      </div>
    );
  }

  if (canAccessDevGames(isStaff)) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 16px 80px",
        textAlign: "center",
      }}
    >
      <div className="card" style={{ padding: "40px 24px" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }} aria-hidden>
          🔒
        </div>
        <h1
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.6rem",
            fontWeight: 900,
            color: "var(--cream)",
            marginBottom: 8,
          }}
        >
          {gameName}
        </h1>
        <p
          style={{
            fontFamily: "'Frank Ruhl Libre',serif",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--gold)",
            marginBottom: 16,
          }}
        >
          בקרוב
        </p>
        <p style={{ color: "var(--muted)", fontSize: ".84rem", lineHeight: 1.7, marginBottom: 28 }}>
          כרגע אנחנו עובדים על לוטו בלבד. {gameName} ייפתח לקהל הרחב בהמשך.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/lotto" className="btn btn-gold">
            לוטו
          </Link>
          <Link href="/" className="btn btn-outline">
            דף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
