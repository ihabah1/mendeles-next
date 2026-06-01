import Nav from "@/components/Nav";
import Link from "next/link";
import StatsWidget from "@/components/StatsWidget";
import HomeHero from "@/components/HomeHero";
import FreeComboCheck from "@/components/FreeComboCheck";
import PremiumSection from "@/components/PremiumSection";

export const metadata = { title: "Mandeles.co.il — לוטו חכם" };

export default function HomePage() {
  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px" }}>

        <HomeHero />

        <FreeComboCheck />

        <PremiumSection />

        <StatsWidget />

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, margin: "40px 0" }}>
          {[
            { icon: "🧮", title: "200 סטים חכמים", desc: "אלגוריתם מנדל מייצר 200 סטים בפיזור מקסימלי לכל הגרלה" },
            { icon: "📋", title: "מילוי טפסים", desc: "מלא ידנית, אוטומטי, או עם המספרים שלך — בקלות ובמהירות" },
            { icon: "🚗", title: "הגשה אישית", desc: "אנחנו מגישים את הטפסים לדוכן מפעל הפיס בשמך" },
            { icon: "💬", title: "עדכונים SMS", desc: "קבל SMS ואימייל על כל שלב — הדפסה, הגשה, תוצאות" },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(26,45,66,.8)", border: "1px solid var(--navy-b)", borderRadius: 12, padding: "20px 18px" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, color: "var(--cream)", marginBottom: 6, fontSize: ".9rem" }}>{f.title}</div>
              <div style={{ fontSize: ".78rem", color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </section>

        <section style={{ textAlign: "center", padding: "40px 0" }}>
          <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.6rem", fontWeight: 900, color: "var(--cream)", marginBottom: 24 }}>מחירים</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, maxWidth: 600, margin: "0 auto" }}>
            {[
              { name: "שבועי", price: "₪25", desc: "200 סטים להגרלה אחת", badge: null },
              { name: "חודשי", price: "₪50", desc: "200 סטים לכל הגרלות החודש", badge: "🔥 הכי משתלם" },
            ].map(p => (
              <div key={p.name} style={{ background: "rgba(26,45,66,.8)", border: "1px solid var(--navy-b)", borderRadius: 12, padding: "24px 18px", position: "relative" }}>
                {p.badge && <div style={{ position: "absolute", top: -10, right: "50%", transform: "translateX(50%)", background: "var(--gold)", color: "var(--navy)", borderRadius: 20, padding: "2px 10px", fontSize: ".65rem", fontWeight: 700 }}>{p.badge}</div>}
                <div style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--gold)", marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontWeight: 700, color: "var(--cream)", marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: ".75rem", color: "var(--muted)" }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 14 }}>+ ₪2.5 דמי טיפול + ₪5 עמלה לכל טבלה</p>
          <Link href="/lotto" className="btn btn-gold" style={{ display: "inline-flex", marginTop: 24, padding: "12px 32px", fontSize: ".92rem" }}>התחל עכשיו →</Link>
        </section>

        <section style={{ background: "rgba(26,45,66,.8)", border: "1px solid var(--navy-b)", borderRadius: 14, padding: "24px 20px", textAlign: "center", margin: "20px 0 40px" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚽</div>
          <h3 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.2rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>ניתוח טוטו חכם</h3>
          <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 16, maxWidth: 480, margin: "0 auto 16px" }}>
            ניתוח סטטיסטי מתקדם לכל משחק — הסתברויות, ניקוד קבוצות, תחזית מזג אוויר
          </p>
          <Link href="/toto" className="btn btn-outline">צפה בניתוח הטוטו →</Link>
        </section>
      </main>
    </>
  );
}
