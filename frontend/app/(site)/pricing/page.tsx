import Nav from "@/components/Nav";
import Link from "next/link";
import HomeGameRows from "@/components/HomeGameRows";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata = { title: "מחירים — Mandeles.co.il" };

function formatToday(): string {
  try {
    return new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date());
  } catch {
    return "";
  }
}

const PLANS = [
  { name: "שבועי", price: "₪25", desc: "200 סטים להגרלה אחת", badge: null },
  { name: "חודשי", price: "₪50", desc: "200 סטים לכל הגרלות החודש", badge: "הכי משתלם" },
] as const;

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="home-main pricing-page">
        <div className="pricing-page-head home-section">
          <h1 className="home-section-title">
            <span aria-hidden>💳</span>
            <span>מחירים</span>
          </h1>
          <p className="pricing-page-sub">מחירון לוטו, 777 וטוטו · עדכון לפי הגרלה</p>
          <LegalDisclaimer compact />
        </div>

        <div className="home-date-bar">
          <span aria-hidden>📅</span>
          <span>{formatToday()}</span>
        </div>

        <section className="home-section--flush">
          <HomeGameRows />
        </section>

        <section className="home-section" style={{ textAlign: "center" }}>
          <h2 className="home-section-title" style={{ justifyContent: "center" }}>
            <span aria-hidden>📦</span>
            <span>חבילות פרימיום</span>
          </h2>
          <div className="home-pricing-grid">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className="home-card"
                style={{ padding: "20px 16px", position: "relative", textAlign: "center" }}
              >
                {p.badge ? (
                  <div
                    style={{
                      position: "absolute",
                      top: -9,
                      right: "50%",
                      transform: "translateX(50%)",
                      background: "var(--gold)",
                      color: "#1a1a1a",
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.badge}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--gold)",
                    marginBottom: 2,
                  }}
                >
                  {p.price}
                </div>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.85rem", marginBottom: 4 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 12 }}>
            + ₪2.5 דמי טיפול + ₪5 עמלה לכל טבלה
          </p>
          <Link
            href="/lotto"
            className="btn btn-gold"
            style={{ display: "inline-flex", marginTop: 16, padding: "11px 28px", fontSize: "0.88rem" }}
          >
            התחל עכשיו →
          </Link>
        </section>
      </main>
    </>
  );
}
