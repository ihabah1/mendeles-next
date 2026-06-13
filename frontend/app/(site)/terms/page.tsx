import Nav from "@/components/Nav";
import Link from "next/link";
import LegalDisclaimer from "@/components/LegalDisclaimer";

export const metadata = { title: "תנאי שימוש — Mandeles.co.il" };

export default function TermsPage() {
  const sections = [
    {
      title: "1. הסכמה לתנאים",
      body: "השימוש באתר Mandeles.co.il מהווה הסכמה לתנאי השימוש הבאים. אם אינך מסכים לתנאים, אנא הפסק להשתמש בשירות.",
    },
    {
      title: "2. גילוי נאות — אין קשר למפעל הפיס",
      body: "Mandeles אינו קשור, אינו מופעל, אינו מיוצג ואינו חלק ממפעל הפיס. אין להשתמש בשירות כאילו מדובר בערוץ רשמי של מפעל הפיס. השירות מספק ניתוח סטטיסטי, המלצות מספרים ושירות שליחות לרכישת טפסי לוטו בשם הלקוח בלבד.",
    },
    {
      title: "3. אין הבטחה לזכייה",
      body: "לוטו הוא משחק מזל. האלגוריתם מבצע פיזור סטטיסטי של צירופים על בסיס נתוני עבר — אין בכך הבטחה לזכייה או להגדלת ההסתברות המתמטית לזכייה. תוצאות עבר אינן מבטיחות תוצאות עתידיות.",
    },
    {
      title: "4. מי רוכש את הכרטיס ומי מחזיק בו",
      body: "הכרטיס נרכש על שם הלקוח וברשותו. Mandeles פועל כשלוח של הלקוח לרכישת הטופס. הטופס הפיזי המקורי מוחזק אצלנו לצורך הגשה לדוכן מפעל הפיס, והלקוח מקבל צילום/סריקה של הטופס לאחר הרכישה. כל זכייה שייכת ללקוח בלבד.",
    },
    {
      title: "5. תשלומים, עמלה והחזרים",
      body: "התשלום כולל את עלות הטופס הרשמית ואת עמלת השירות (ניתוח, מילוי, שליחות והגשה). במקרה של ביטול לפני הגשה פיזית לדוכן — הסכום יוחזר לארנק הדיגיטלי בניכוי עמלת ביטול אם חלה. לאחר הגשה לדוכן — אין אפשרות לביטול. במקרה של תקלה, אי-רכישה או טעות בהזנה — יש לפנות לתמיכה; נבחן החזר או פיצוי לפי נסיבות האירוע.",
    },
    {
      title: "6. אחריות ותקנון פיס",
      body: "אנחנו אחראים להגשה תקינה של הטפסים שמילאת בהתאם להזמנתך, אך לא לתוצאות ההגרלה. ההשתתפות כפופה לתקנון הרשמי של מפעל הפיס. גיל מינימלי להשתתפות: 18.",
    },
    {
      title: "7. פרטיות",
      body: "אנחנו שומרים על פרטיות המשתמשים. המידע האישי משמש אך ורק לצורך מתן השירות. לא נמכור או נעביר מידע לצדדים שלישיים ללא הסכמה, אלא אם נדרש בחוק.",
    },
    {
      title: "8. שינויים בתנאים",
      body: "Mandeles.co.il שומר לעצמו את הזכות לשנות את תנאי השימוש בכל עת. המשך שימוש בשירות לאחר שינוי מהווה הסכמה לתנאים החדשים.",
    },
    {
      title: "9. יצירת קשר",
      body: "לכל שאלה או פנייה: support@mandeles.co.il",
    },
  ];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px" }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>תנאי שימוש</h1>
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginBottom: 24 }}>עדכון אחרון: יוני 2026</p>

        <div style={{ marginBottom: 24 }}>
          <LegalDisclaimer />
        </div>

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
