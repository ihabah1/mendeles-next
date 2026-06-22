import Link from "next/link";

export default function GameComingSoon({
  gameName,
  emoji = "🚧",
}: {
  gameName: string;
  emoji?: string;
}) {
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
          {emoji}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
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
            fontFamily: "var(--font-display)",
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--gold)",
            marginBottom: 16,
          }}
        >
          בפיתוח — יהיה זמין בקרוב
        </p>
        <p style={{ color: "var(--muted)", fontSize: ".84rem", lineHeight: 1.7, marginBottom: 28 }}>
          אנחנו עובדים על {gameName}. בינתיים אפשר להמשיך עם לוטו.
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
