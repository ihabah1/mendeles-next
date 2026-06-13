import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata = { title: "777 — בקרוב | Mandeles.co.il" };

export default function Seven77Page() {
  return (
    <>
      <Nav />
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "48px 16px 80px",
          textAlign: "center",
        }}
      >
        <div className="card" style={{ padding: "40px 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }} aria-hidden>
            🎰
          </div>
          <h1
            style={{
              fontFamily: "'Frank Ruhl Libre',serif",
              fontSize: "2rem",
              fontWeight: 900,
              color: "var(--cream)",
              marginBottom: 8,
            }}
          >
            777
          </h1>
          <p
            style={{
              fontFamily: "'Frank Ruhl Libre',serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "var(--gold)",
              marginBottom: 16,
            }}
          >
            בקרוב
          </p>
          <p style={{ color: "var(--muted)", fontSize: ".84rem", lineHeight: 1.7, marginBottom: 28 }}>
            משחק 777 נמצא בפיתוח ויהיה זמין בקרוב.
            <br />
            בינתיים אפשר להמשיך עם לוטו.
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
    </>
  );
}
