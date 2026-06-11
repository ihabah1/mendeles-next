import Nav from "@/components/Nav";
import Link from "next/link";
import StatsWidget from "@/components/StatsWidget";
import HomeHero from "@/components/HomeHero";
import WinnerTabBar from "@/components/WinnerTabBar";
import FreeComboCheck from "@/components/FreeComboCheck";
import PremiumSection from "@/components/PremiumSection";

export const metadata = { title: "Mandeles.co.il — לוטו חכם" };

const FEATURES = [
  { icon: "🧮", title: "200 סטים חכמים", desc: "אלגוריתם מנדל מייצר 200 סטים בפיזור מקסימלי" },
  { icon: "📋", title: "מילוי טפסים", desc: "ידני, אוטומטי, או עם המספרים שלך" },
  { icon: "🚗", title: "הגשה אישית", desc: "מגישים את הטפסים לדוכן מפעל הפיס" },
  { icon: "💬", title: "עדכונים SMS", desc: "SMS ואימייל על כל שלב" },
];

const GAME_ROWS = [
  {
    time: "הגרלה הבאה",
    title: "לוטו — 14 טבלאות, מספר חזק",
    href: "/lotto",
    odds: [
      { label: "מילוי ידני", val: "₪2.5+" },
      { label: "200 סטים", val: "₪25" },
      { label: "פרימיום", val: "₪50" },
    ],
  },
  {
    time: "זמין עכשיו",
    title: "777 — משחק מזל מהיר",
    href: "/seven77",
    odds: [
      { label: "טבלה אחת", val: "₪5" },
      { label: "3 טבלאות", val: "₪12" },
      { label: "מקסימום", val: "₪40" },
    ],
  },
  {
    time: "ניתוח חכם",
    title: "טוטו — ניתוח סטטיסטי",
    href: "/toto",
    odds: [
      { label: "16 משחקים", val: "₪8" },
      { label: "ניתוח AI", val: "חינם" },
      { label: "הגשה", val: "₪15" },
    ],
  },
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
        <WinnerTabBar />

        <div className="home-date-bar">
          <span aria-hidden>📅</span>
          <span>{formatToday()}</span>
        </div>

        <section className="home-section--flush">
          {GAME_ROWS.map((row) => (
            <div key={row.title} className="winner-row">
              <div className="winner-row-info">
                <span className="winner-row-time">{row.time}</span>
                <div>{row.title}</div>
              </div>
              <div className="winner-odds">
                {row.odds.map((o) => (
                  <Link key={o.label} href={row.href} className="winner-odd-btn">
                    <span className="winner-odd-label">{o.label}</span>
                    <span className="winner-odd-val">{o.val}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
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

        <section className="home-card home-section" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 20px" }}>
          <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>⚽</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 900, color: "var(--gold)", marginBottom: 4 }}>
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
