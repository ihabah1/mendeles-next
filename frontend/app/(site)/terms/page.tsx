import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata = { title: "תנאי שימוש — Mandeles.co.il" };

export default function TermsPage() {
  const sections = [
    { title: "1. הסכמה לתנאים", body: "השימוש באתר Mandeles.co.il מהווה הסכמה לתנאי השימוש הבאים. אם אינך מסכים לתנאים, אנא הפסק להשתמש בשירות." },
    { title: "2. גיל מינימלי", body: "השירות מיועד לבני 18 ומעלה בלבד. על ידי שימוש בשירות, אתה מצהיר שאתה בן 18 לפחות." },
    { title: "3. אחריות השירות", body: "Mandeles.co.il מספק שירות של מילוי והגשת טפסי לוטו. אנחנו אחראים להגשה תקינה של הטפסים שמילאת, אך לא לתוצאות ההגרלה. לוטו הוא משחק מזל ואין כל ערובה לזכייה." },
    { title: "4. תשלומים והחזרים", body: "העמלות שנגבות כוללות דמי טיפול ועמלת שירות. במקרה של ביטול הזמנה לפני הגשה, יוחזר הסכום לארנק הדיגיטלי בניכוי עמלת ביטול. לאחר הגשה פיזית לדוכן — אין אפשרות לביטול." },
    { title: "5. פרטיות", body: "אנחנו שומרים על פרטיות המשתמשים. המידע האישי משמש אך ורק לצורך מתן השירות. לא נמכור או נעביר מידע לצדדים שלישיים ללא הסכמה." },
    { title: "6. שינויים בתנאים", body: "Mandeles.co.il שומר לעצמו את הזכות לשנות את תנאי השימוש בכל עת. המשך שימוש בשירות לאחר שינוי מהווה הסכמה לתנאים החדשים." },
    { title: "7. יצירת קשר", body: "לכל שאלה או פנייה: support@mandeles.co.il" },
  ];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px" }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>תנאי שימוש</h1>
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 32 }}>עדכון אחרון: ינואר 2026</p>

        {sections.map(s => (
          <section key={s.title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1rem", fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>{s.title}</h2>
            <p style={{ color: "var(--muted)", fontSize: ".82rem", lineHeight: 1.8 }}>{s.body}</p>
          </section>
        ))}

        <div style={{ background: "rgba(232,0,30,.08)", border: "1px solid rgba(232,0,30,.2)", borderRadius: 10, padding: "12px 16px", marginTop: 24, fontSize: ".76rem", color: "var(--muted)" }}>
          ⚠️ לוטו וטוטו הם משחקי מזל. גיל מינימלי 18. בעיות הימורים? <a href="tel:1800232425" style={{ color: "var(--gold)" }}>1-800-23-24-25</a>
        </div>

        <Link href="/" className="btn btn-gold" style={{ display: "inline-flex", marginTop: 24 }}>חזרה לדף הבית</Link>
      </div>
    </>
  );
}
