import Nav from "@/components/Nav";
import Link from "next/link";
import StatsWidget from "@/components/StatsWidget";
import HomeHero from "@/components/HomeHero";
import WinnerTabBar from "@/components/WinnerTabBar";
import FreeComboCheck from "@/components/FreeComboCheck";
import PremiumSection from "@/components/PremiumSection";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import DrawCountdown from "@/components/DrawCountdown";
import HomeGameRows from "@/components/HomeGameRows";
import HomeTotoPromo from "@/components/HomeTotoPromo";

export const metadata = { title: "Mandeles.co.il — ניתוח סטטיסטי ולוטו" };

const FEATURES = [
  { icon: "🧮", title: "200 צירופים", desc: "פיזור סטטיסטי של מספרים — ללא הבטחת זכייה" },
  { icon: "📋", title: "מילוי טפסים", desc: "ידני, אוטומטי, או עם המספרים שלך" },
  { icon: "🚗", title: "הגשה בשמך", desc: "רכישת הטופס על שמך והגשה לדוכן מפעל הפיס" },
  { icon: "💬", title: "עדכונים", desc: "SMS ואימייל · צילום טופס לאחר רכישה" },
];

function formatToday(): string {
  try {
    return new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date());
  } catch {
    return "";
  }
}

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="home-main">
        <HomeHero />
        <div style={{ padding: "0 16px", maxWidth: 900, margin: "0 auto 12px" }}>
          <LegalDisclaimer compact />
        </div>
        <DrawCountdown />
        <WinnerTabBar />

        <div className="home-date-bar">
          <span aria-hidden>📅</span>
          <span>{formatToday()}</span>
        </div>

        <section className="home-section--flush">
          <HomeGameRows />
        </section>

        <div className="home-grid-2 home-section">
          <FreeComboCheck />
          <StatsWidget />
        </div>

        <div id="premium">
          <PremiumSection />
        </div>

        <hr className="home-divider" style={{ margin: "0 16px", borderColor: "var(--border)" }} />

        <section className="home-section">
          <h2 className="home-section-title">
            <span aria-hidden>✨</span>
            <span>למה Mandeles?</span>
          </h2>
          <div className="home-grid-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="home-feature">
                <div className="home-feature-icon">{f.icon}</div>
                <div className="home-feature-title">{f.title}</div>
                <div className="home-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="home-section" style={{ textAlign: "center" }}>
          <h2 className="home-section-title" style={{ justifyContent: "center" }}>
            <span aria-hidden>💳</span>
            <span>מחירים</span>
          </h2>
          <div className="home-pricing-grid">
            {[
              { name: "שבועי", price: "₪25", desc: "200 סטים להגרלה אחת", badge: null },
              { name: "חודשי", price: "₪50", desc: "200 סטים לכל הגרלות החודש", badge: "הכי משתלם" },
            ].map((p) => (
              <div key={p.name} className="home-card" style={{ padding: "20px 16px", position: "relative", textAlign: "center" }}>
                {p.badge && (
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
                )}
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 900, color: "var(--gold)", marginBottom: 2 }}>
                  {p.price}
                </div>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.85rem", marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 12 }}>
            + ₪2.5 דמי טיפול + ₪5 עמלה לכל טבלה
          </p>
          <Link href="/lotto" className="btn btn-gold" style={{ display: "inline-flex", marginTop: 16, padding: "11px 28px", fontSize: "0.88rem" }}>
            התחל עכשיו →
          </Link>
        </section>

        <HomeTotoPromo />
      </main>
    </>
  );
}
