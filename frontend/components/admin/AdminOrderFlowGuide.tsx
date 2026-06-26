"use client";

import Link from "next/link";
import { AdminPanel } from "@/components/admin/AdminUI";

const STEPS = [
  {
    status: "שולם (paid)",
    icon: "✅",
    color: "#94a3b8",
    title: "1. לקוח שולח טופס",
    body:
      "הלקוח בוחר מספרים, משלם מהארנק ושולח. נוצרת הזמנה עם מספר ייחודי (MAND-…). הסטים נלקחים ממאגר צירופים שלא ניתנו בעבר. ההזמנה נכנסת אוטומטית לתור ההדפסה.",
    staff: "אין פעולה נדרשת — בדוק שההזמנה מופיעה ברשימה.",
  },
  {
    status: "בתור (queued)",
    icon: "🕐",
    color: "#94a3b8",
    title: "2. נכנס לתור ההדפסה (אוטומטי)",
    body:
      "משימת הדפסה נוצרת ומאושרת אוטומטית — מוכנה לספול ההדפסה. סוכן ההדפסה (print_agent) או תוכנת הדוכן ימשכו אותה כשהמדפסת מחוברת.",
    staff: "אין חובה לאשר ידנית. לשליטה: תור ההדפסה — ביטול, קדימות, דילוג או «שלח» מחדש.",
  },
  {
    status: "מאושר (approved)",
    icon: "✅",
    color: "#c9a84c",
    title: "3. בספול / ממתין למשיכה",
    body:
      "המשימה בסטטוס «מאושר» — הסוכן המקומי מושך אותה, שולח למדפסת ומדפיס את הטופס.",
    staff: "ודא שסוכן ההדפסה או תוכנת הדוכן פעילים. אם נתקע — «נסה שוב» או דילוג לשלב הבא.",
  },
  {
    status: "נלקח / בדפוס",
    icon: "🖨️",
    color: "#8aaabe",
    title: "4. סוכן מדפיס",
    body:
      "הסוכן לקח את המשימה, שולח לשרת המדפסת המקומי ומדפיס את הטופס הפיזי על שם הלקוח.",
    staff: "אם נתקע — בדוק לוג אינטגרציות. אפשר «נסה שוב» או דילוג לשלב הבא בתור ההדפסה.",
  },
  {
    status: "הודפס (printed)",
    icon: "🖨️",
    color: "#8aaabe",
    title: "5. הודפס",
    body:
      "הסוכן אישר שההדפסה הסתיימה (confirm). הטופס הודפס — כעת צריך לסרוק אותו.",
    staff: "הרץ scan_app על מחשב הסריקה, או «דלג לסריקה» אם כבר סרקת ידנית.",
  },
  {
    status: "נסרק",
    icon: "📄",
    color: "#1db96a",
    title: "6. סריקת טופס",
    body:
      "scan_app מעלה PDF של הטופס הסרוק. הלקוח יוכל לראות את הצילום בפרופיל שלו.",
    staff: "במסך «סריקה» רואים הזמנות ממתינות. אחרי העלאה — סטטוס «הושלם».",
  },
  {
    status: "הושלם (completed)",
    icon: "✅",
    color: "#1db96a",
    title: "7. הושלם",
    body:
      "התהליך הסתיים: טופס הודפס, נסרק, והלקוח קיבל גישה לצילום. הזכייה (אם תהיה) שייכת ללקוח.",
    staff: "אין פעולה נוספת. אפשר להנפיק חשבונית iCount אם טרם הונפקה.",
  },
];

const EXTRAS = [
  {
    title: "חשבונית (iCount)",
    body: "כפתור «הנפק חשבונית» יוצר מסמך ב-iCount. לא חובה לכל שלב — אפשר לפני או אחרי ההדפסה.",
  },
  {
    title: "שינוי סטטוס ידני",
    body: "התפריט ליד כל הזמנה מאפשר עדכון סטטוס ידני — השתמש רק כשיש סיבה מיוחדת (ביטול, תיקון).",
  },
  {
    title: "ביטול",
    body: "סטטוס «בוטל» — ההזמנה לא תמשיך בתור. בטל מתור ההדפסה אם עדיין לא הודפסה.",
  },
];

export default function AdminOrderFlowGuide() {
  return (
    <AdminPanel
      id="admin-order-flow"
      title="📖 מדריך צוות — תהליך הזמנה מקצה לקצה"
      defaultOpen
    >
      <p style={{ fontSize: ".8rem", color: "var(--muted)", lineHeight: 1.65, margin: "0 0 16px" }}>
        Mandeles אינו מפעיל הגרלה — אנו ממלאים ומגישים טפסי לוטו בשם הלקוח. להלן שלבי העבודה
        שכל עובד צריך להכיר, מה הסטטוס אומר, ומה הפעולה הנדרשת.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {STEPS.map((step) => (
          <div
            key={step.title}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              borderRight: `4px solid ${step.color}`,
              background: "rgba(0,0,0,.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span aria-hidden>{step.icon}</span>
              <strong style={{ color: "var(--cream)", fontSize: ".84rem" }}>{step.title}</strong>
              <span
                style={{
                  fontSize: ".68rem",
                  fontWeight: 700,
                  color: step.color,
                  background: `${step.color}22`,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {step.status}
              </span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: ".76rem", color: "var(--muted)", lineHeight: 1.6 }}>
              {step.body}
            </p>
            <p style={{ margin: 0, fontSize: ".74rem", color: "var(--cream)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--gold)" }}>צוות: </strong>
              {step.staff}
            </p>
          </div>
        ))}
      </div>

      <h3
        style={{
          fontSize: ".82rem",
          fontWeight: 800,
          color: "var(--cream)",
          margin: "18px 0 10px",
        }}
      >
        נושאים נוספים
      </h3>
      <ul
        style={{
          margin: 0,
          paddingRight: 20,
          fontSize: ".76rem",
          color: "var(--muted)",
          lineHeight: 1.7,
        }}
      >
        {EXTRAS.map((e) => (
          <li key={e.title} style={{ marginBottom: 8 }}>
            <strong style={{ color: "var(--cream)" }}>{e.title} — </strong>
            {e.body}
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 16,
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px dashed var(--gold-border)",
          background: "var(--gold-bg)",
          fontSize: ".74rem",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--gold)" }}>קישורים שימושיים: </strong>
        <Link href="/admin/print-queue" style={{ color: "var(--cream)", marginInline: 6 }}>
          תור הדפסה
        </Link>
        ·
        <Link href="/admin/scan" style={{ color: "var(--cream)", marginInline: 6 }}>
          מסך סריקה
        </Link>
        ·
        <Link href="/admin/monitoring" style={{ color: "var(--cream)", marginInline: 6 }}>
          ניטור
        </Link>
        <div style={{ marginTop: 8, color: "var(--muted)" }}>
          כלים מקומיים: <code>python tools/print_agent.py</code> (הדפסה) ·{" "}
          <code>python tools/scan_app.py</code> (סריקה)
        </div>
      </div>
    </AdminPanel>
  );
}
