import Nav from "@/components/Nav";
import Link from "next/link";
import TetrisGame from "@/components/TetrisGame";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata = { title: "אודות — Mandeles.co.il" };

export default function AboutPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px" }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>אודות Mandeles.co.il</h1>
        <p style={{ color: "var(--muted)", fontSize: ".82rem", marginBottom: 20 }}>שירות ניתוח סטטיסטי, המלצות מספרים והגשת טפסי לוטו בשם הלקוח</p>
        <LegalDisclaimer compact />

        {[
          { title: "מה אנחנו עושים?", body: "Mandeles.co.il אינו מפעיל הגרלה ואינו קשור למפעל הפיס. אנו מספקים שירות ניתוח סטטיסטי, המלצות צירופי מספרים, מילוי טפסים והגשתם לדוכן מפעל הפיס בשם הלקוח — בתמורה לעמלת שירות ועלות הטופס." },
          { title: "האלגוריתם שלנו", body: 'אלגוריתם "מנדל" מבצע פיזור סטטיסטי של צירופים על בסיס נתוני עבר. הפיזור אינו מגדיל את ההסתברות המתמטית הבסיסית לזכייה בהגרלה. אין בכך הבטחה לזכייה — לוטו הוא משחק מזל.' },
          { title: "תהליך ההגשה", body: "הלקוח ממנה אותנו כשלוח לרכישת טופס. הכרטיס נרכש על שם הלקוח, והלקוח מקבל צילום של הטופס לאחר הרכישה. תקבל עדכוני SMS ואימייל בכל שלב — הדפסה, הגשה ואישור." },
          { title: "זכייה ואחריות", body: "כל זכייה שייכת ללקוח בלבד. אנו מסייעים במעקב ובהעברת מידע, בכפוף לתקנון מפעל הפיס. במקרה של ביטול, תקלה או טעות בהקלדה — ראו תנאי השימוש." },
        ].map(s => (
          <section key={s.title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>{s.title}</h2>
            <p style={{ color: "var(--muted)", fontSize: ".84rem", lineHeight: 1.8 }}>{s.body}</p>
          </section>
        ))}

        <div style={{ border: "2px dashed var(--gold)", padding: "20px", textAlign: "center", marginTop: 40, marginBottom: 20, color: "var(--gold)" }}>
          <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: 10 }}>משחק טטריס</h2>
          <TetrisGame />
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".75rem", textAlign: "center" }}>Mandeles.co.il — שירות שליחות וניתוח סטטיסטי</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link href="/terms" className="btn btn-outline">תנאי שימוש</Link>
          <Link href="/accessibility" className="btn btn-outline">הצהרת נגישות</Link>
          <Link href="/" className="btn btn-gold">חזרה לדף הבית</Link>
        </div>
      </div>
    </>
  );
}
