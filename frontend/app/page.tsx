import Nav from "@/components/Nav";
import StatsWidget from "@/components/StatsWidget";
import HomeHero from "@/components/HomeHero";
import WinnerTabBar from "@/components/WinnerTabBar";
import FreeComboCheck from "@/components/FreeComboCheck";
import PremiumSection from "@/components/PremiumSection";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import DrawCountdown from "@/components/DrawCountdown";
import HomeTotoPromo from "@/components/HomeTotoPromo";

export const metadata = { title: "Mandeles.co.il — ניתוח סטטיסטי ולוטו" };

const FEATURES = [
  { icon: "🧮", title: "200 צירופים", desc: "פיזור סטטיסטי של מספרים — ללא הבטחת זכייה" },
  { icon: "📋", title: "מילוי טפסים", desc: "ידני, אוטומטי, או עם המספרים שלך" },
  { icon: "🚗", title: "הגשה בשמך", desc: "רכישת הטופס על שמך והגשה לדוכן מפעל הפיס" },
  { icon: "💬", title: "עדכונים", desc: "SMS ואימייל · צילום טופס לאחר רכישה" },
];

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="home-main">
        <HomeHero />
        <div className="home-legal-top" style={{ padding: "0 16px", maxWidth: 900, margin: "0 auto 12px" }}>
          <LegalDisclaimer compact />
        </div>
        <DrawCountdown />
        <WinnerTabBar />

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

        <HomeTotoPromo />
      </main>
    </>
  );
}
