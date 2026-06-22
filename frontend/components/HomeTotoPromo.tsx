import Link from "next/link";

export default function HomeTotoPromo() {
  return (
    <section
      className="home-card home-section"
      style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 20px" }}
    >
      <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>⚽</div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1rem",
            fontWeight: 900,
            color: "var(--gold)",
            marginBottom: 4,
          }}
        >
          טוטו
        </h3>
        <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
          בפיתוח — יהיה זמין בקרוב
        </p>
      </div>
      <Link href="/toto" className="btn btn-outline" style={{ fontSize: "0.78rem", flexShrink: 0 }}>
        מידע נוסף →
      </Link>
    </section>
  );
}
