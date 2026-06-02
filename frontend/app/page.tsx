import Nav from "@/components/Nav";
import Link from "next/link";
import StatsWidget from "@/components/StatsWidget";
import HomeHero from "@/components/HomeHero";
import FreeComboCheck from "@/components/FreeComboCheck";
import PremiumSection from "@/components/PremiumSection";

export const metadata = { title: "Mandeles.co.il — לוטו חכם" };

const FEATURES = [
  { icon: "🧮", title: "200 סטים חכמים", desc: "אלגוריתם מנדל מייצר 200 סטים בפיזור מקסימלי" },
  { icon: "📋", title: "מילוי טפסים", desc: "ידני, אוטומטי, או עם המספרים שלך" },
  { icon: "🚗", title: "הגשה אישית", desc: "מגישים את הטפסים לדוכן מפעל הפיס" },
  { icon: "💬", title: "עדכונים SMS", desc: "SMS ואימייל על כל שלב" },
];

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="home-main">
        <HomeHero />

        <div className="home-grid-2 home-section">
          <FreeComboCheck />
          <StatsWidget />
        </div>

        <PremiumSection />

        <hr className="home-divider" />

        <section className="home-section">
          <h2 className="home-section-title">
            <span aria-hidden>✨</span>
            <span>למה Mandeles?</span>
          </h2>
          <div className="home-grid-4">
            {FEATURES.map(f => (
              <div key={f.title} className="home-feature">
                <div className="home-feature-icon">{f.icon}</div>
                <div className="home-feature-title">{f.title}</div>
                <div className="home-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section" style={{ textAlign: "center" }}>
          <h2 className="home-section-title" style={{ justifyContent: "center" }}>
            <span aria-hidden>💳</span>
            <span>מחירים</span>
          </h2>
          <div className="home-pricing-grid">
            {[
              { name: "שבועי", price: "₪25", desc: "200 סטים להגרלה אחת", badge: null },
              { name: "חודשי", price: "₪50", desc: "200 סטים לכל הגרלות החודש", badge: "🔥 הכי משתלם" },
            ].map(p => (
              <div
                key={p.name}
                className="home-card"
                style={{ padding: "20px 16px", position: "relative", textAlign: "center" }}
              >
                {p.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -9,
                      right: "50%",
                      transform: "translateX(50%)",
                      background: "var(--gold)",
                      color: "var(--navy)",
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
                <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.6rem", fontWeight: 900, color: "var(--gold)", marginBottom: 2 }}>
                  {p.price}
                </div>
                <div style={{ fontWeight: 700, color: "var(--cream)", fontSize: "0.85rem", marginBottom: 4 }}>{p.name}</div>
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

        <section
          className="home-card home-section"
          style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 20px" }}
        >
          <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>⚽</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h3 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 900, color: "var(--cream)", marginBottom: 4 }}>
              ניתוח טוטו חכם
            </h3>
            <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
              ניתוח סטטיסטי מתקדם — הסתברויות, ניקוד קבוצות, תחזית מזג אוויר
            </p>
          </div>
          <Link href="/toto" className="btn btn-outline" style={{ fontSize: "0.78rem", flexShrink: 0 }}>
            צפה בניתוח →
          </Link>
        </section>
      </main>
    </>
  );
}
