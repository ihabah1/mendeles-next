import Nav from "@/components/Nav";
import Link from "next/link";
import TetrisGame from "@/components/TetrisGame";

export const metadata = { title: "אודות — Mandeles.co.il" };

export default function AboutPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px 60px" }}>
        <h1 style={{ fontFamily: "'Frank Ruhl Libre',serif", fontSize: "1.8rem", fontWeight: 900, color: "var(--cream)", marginBottom: 8 }}>🎯 אודות Mandeles.co.il</h1>
        <p style={{ color: "var(--muted)", fontSize: ".82rem", marginBottom: 32 }}>שירות מילוי טפסי לוטו מקצועי</p>

        {[
          { title: "מה אנחנו עושים?", body: "Mandeles.co.il מספק שירות מלא למשתתפי הלוטו הישראלי. אנחנו מחשבים 200 סטים מקסימלי-מכסים לכל הגרלה, מאפשרים מילוי נוח של הטפסים, ומגישים אותם פיזית לדוכן מפעל הפיס — הכל בלי שתצטרך לצאת מהבית." },
          { title: "האלגוריתם שלנו", body: 'אלגוריתם "מנדל" מבוסס על עקרון כיסוי מגרש מתמטי. 200 הסטים שלנו מבטיחים פיזור מקסימלי של כל המספרים מ-1 עד 37, כך שכל מספר מופיע בתדירות אופטימלית. זה לא מבטיח זכייה — לוטו הוא משחק מזל — אבל מבטיח הגנה מקסימלית.' },
          { title: "תהליך ההגשה", body: "לאחר שמלאת את הטפסים, צוות Mandeles מדפיס ומגיש אותם לדוכן מפעל הפיס בשמך. תקבל עדכון SMS ואימייל בכל שלב — הדפסה, הגשה, ואישור." },
          { title: "אחריות ובטיחות", body: "Mandeles.co.il פועל בהתאם לחוקי מדינת ישראל. שירותינו מיועדים לבני 18 ומעלה בלבד. אנחנו לא מספקים ייעוץ השקעות — לוטו הוא בידור, לא השקעה." },
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
        <p style={{ color: "var(--muted)", fontSize: ".75rem", textAlign: "center" }}>הדף נוצר ע"י צוות מנצח</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link href="/terms" className="btn btn-outline">תנאי שימוש</Link>
          <Link href="/accessibility" className="btn btn-outline">הצהרת נגישות</Link>
          <Link href="/" className="btn btn-gold">חזרה לדף הבית</Link>
        </div>
      </div>
    </>
  );
}
