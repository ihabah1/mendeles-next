import Link from "next/link";

/** גילוי נאות משפטי — מוצג בדפים ציבוריים מרכזיים */
export default function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className="legal-disclaimer"
      role="note"
      aria-label="גילוי נאות משפטי"
      style={{
        background: "rgba(232,0,30,.06)",
        border: "1px solid rgba(232,0,30,.18)",
        borderRadius: compact ? 8 : 12,
        padding: compact ? "10px 12px" : "14px 16px",
        fontSize: compact ? ".68rem" : ".74rem",
        lineHeight: 1.65,
        color: "var(--muted)",
      }}
    >
      <strong style={{ color: "var(--text2)", display: "block", marginBottom: compact ? 4 : 6 }}>
        גילוי נאות
      </strong>
      <p style={{ margin: 0 }}>
        Mandeles אינו קשור, אינו מופעל ואינו מייצג את מפעל הפיס. השירות מספק ניתוח סטטיסטי,
        המלצות מספרים ושירות שליחות לרכישת טפסים בשם הלקוח בלבד. אין הבטחה לזכייה; תוצאות עבר
        אינן מבטיחות תוצאות עתידיות. ההשתתפות כפופה ל
        <Link href="/terms" style={{ color: "var(--gold)", marginInline: 4 }}>תנאי השימוש</Link>
        ולתקנון הרשמי של מפעל הפיס. גיל מינימלי 18.
      </p>
    </aside>
  );
}
