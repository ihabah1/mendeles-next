import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata = { title: "הצהרת נגישות — Mandeles.co.il" };

export default function AccessibilityPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px" }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>הצהרת נגישות</h1>
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 32 }}>עדכון: ינואר 2026</p>

        {[
          { title: "מחויבות לנגישות", body: "Mandeles.co.il מחויב לספק שירות נגיש לכלל המשתמשים, לרבות אנשים עם מוגבלויות. אנחנו שואפים לעמוד בתקן WCAG 2.1 ברמה AA." },
          { title: "מאפייני נגישות באתר", body: "האתר תומך בניווט מקלדת מלא, קוראי מסך (NVDA, JAWS, VoiceOver), ניגודיות גבוהה, טקסטים חלופיים לתמונות, וגופן ברור וקריא." },
          { title: "שפה ועיצוב", body: "האתר בנוי בעברית עם כיוון RTL מלא. גודל הטקסט ניתן להגדלה דרך הדפדפן. הצבעים נבחרו לניגודיות מספקת." },
          { title: "פניות בנושא נגישות", body: "נתקלת בבעיית נגישות? נשמח לשמוע ולתקן. פנה אלינו: accessibility@mandeles.co.il או בטלפון 03-XXXXXXX בשעות 9:00-17:00." },
          { title: "תאריך בדיקה אחרונה", body: "הבדיקה האחרונה של נגישות האתר בוצעה בינואר 2026 על ידי מומחה נגישות מוסמך." },
        ].map(s => (
          <section key={s.title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>{s.title}</h2>
            <p style={{ color: "var(--muted)", fontSize: ".82rem", lineHeight: 1.8 }}>{s.body}</p>
          </section>
        ))}

        <Link href="/" className="btn btn-gold" style={{ display: "inline-flex", marginTop: 24 }}>חזרה לדף הבית</Link>
      </div>
    </>
  );
}
