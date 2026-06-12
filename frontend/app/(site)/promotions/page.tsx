import Link from "next/link";
import Nav from "@/components/Nav";

export const metadata = { title: "מבצעים" };

const PROMOS = [
  {
    id: "invite",
    emoji: "🎉",
    gradient: "linear-gradient(135deg, #1a3a6e 0%, #2a6e3a 100%)",
    daysLeft: 18,
    title: "כיף להיות מנדלס ביחד! הזמן חברים להצטרף וקבל הטבה 2026",
    desc: "רק ללקוחות האונליין — הזמן חברים להצטרף לקהילת Mandeles באמצעות הקוד האישי שלך. עבור כל חבר שיירשם וישחק תקבל ₪30 הטבה. *בכפוף לתנאי המבצע.",
    cta: "הזמן חבר",
    href: "/auth",
  },
  {
    id: "newcustomer",
    emoji: "⚽",
    gradient: "linear-gradient(135deg, #0d2818 0%, #1a5e8e 100%)",
    daysLeft: 18,
    title: "לקוח חדש? הרשם לאתר שחק וקבל 20 ₪ מתנה, אחד ללקוח",
    desc: "לקוח חדש? הרשם לאתר. שחק וקבל 20 ₪ מתנה להימור הבא שלך. בכפוף לתנאי המבצע (המבצע תקף במשחקי הליין בלבד ולסה\"כ טופס יחיד).",
    cta: "פתח חשבון",
    href: "/auth",
  },
  {
    id: "monthly",
    emoji: "🏆",
    gradient: "linear-gradient(135deg, #6e1a1a 0%, #8e6e1a 100%)",
    daysLeft: 25,
    title: "מנוי חודשי — 200 סטים לכל הגרלות החודש ב-₪50 בלבד",
    desc: "הצטרף למנוי החודשי וקבל 200 סטים מחושבים באלגוריתם מנדל לכל הגרלה במהלך החודש. מילוי מקצועי, הגשה אישית לפיס ומעקב עד הסריקה. *בכפוף לתנאי המבצע.",
    cta: "הצטרף עכשיו",
    href: "/lotto",
  },
] as const;

export default function PromotionsPage() {
  return (
    <>
      <Nav />
      <main className="promos-main">
        <div className="promos-breadcrumb">
          <Link href="/">ראשי</Link>
          <span aria-hidden>‹</span>
          <span className="promos-breadcrumb-current">מבצעים</span>
        </div>

        <div className="promos-list">
          {PROMOS.map((p) => (
            <article key={p.id} className="promo-card">
              <div className="promo-card-media" style={{ background: p.gradient }}>
                <span className="promo-card-emoji" aria-hidden>{p.emoji}</span>
                <span className="promo-card-days">
                  <strong>{p.daysLeft}</strong>
                  <small>ימים נותרו</small>
                </span>
              </div>
              <div className="promo-card-body">
                <h2 className="promo-card-title">{p.title}</h2>
                <p className="promo-card-desc">{p.desc}</p>
                <div className="promo-card-actions">
                  <Link href={p.href} className="promo-card-cta">
                    {p.cta}
                  </Link>
                  <Link href="/terms" className="promo-card-terms">
                    תנאי מבצע
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
