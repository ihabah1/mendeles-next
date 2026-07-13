import type { ToolSlug } from "./catalog";

type Locale = "he" | "en";

type ToolCopy = {
  title: string;
  short: string;
  description: string;
};

type ToolsCopy = {
  hubTitle: string;
  hubSubtitle: string;
  menuTitle: string;
  openTool: string;
  backToTools: string;
  backToBlog: string;
  toolsNav: string;
  disclaimer: string;
  calculate: string;
  result: string;
  reset: string;
  download: string;
  chooseImage: string;
  choosePdf: string;
  uploadLogo: string;
  createPdf: string;
  fixText: string;
  documentNature: string;
  documentNatureHint: string;
  documentText: string;
  copy: string;
  copied: string;
  loading: string;
  error: string;
  tools: Record<ToolSlug, ToolCopy>;
};

const HE: ToolsCopy = {
  hubTitle: "כלים שימושיים",
  hubSubtitle: "מחשבונים וכלי עזר חינמיים — לשימוש יומיומי בעברית",
  menuTitle: "כלים שימושיים",
  openTool: "פתח כלי",
  backToTools: "כל הכלים",
  backToBlog: "חזרה לבלוג",
  toolsNav: "כלים",
  disclaimer: "הכלים מיועדים להערכה כללית בלבד ואינם מהווים ייעוץ מקצועי.",
  calculate: "חשב",
  result: "תוצאה",
  reset: "איפוס",
  download: "הורדה",
  chooseImage: "בחרו תמונה",
  choosePdf: "בחרו PDF",
  uploadLogo: "טעינת לוגו",
  createPdf: "יצירת PDF",
  fixText: "תקן טקסט",
  documentNature: "אופי המסמך",
  documentNatureHint: "אופציונלי — למשל הצעת מחיר, מכתב, אישור",
  documentText: "טקסט המסמך",
  copy: "העתק",
  copied: "הועתק",
  loading: "טוען…",
  error: "משהו השתבש. נסו שוב.",
  tools: {
    "net-salary": {
      title: "מחשבון שכר נטו (ישראל)",
      short: "מחשב שכר ברוטו ↔ נטו",
      description: "הערכת שכר נטו לפי מס הכנסה, ביטוח לאומי ומס בריאות — לפי מדרגות משוערות.",
    },
    mortgage: {
      title: "מחשבון משכנתא",
      short: "החזר חודשי, ריבית ולוח סילוקין",
      description: "חשבו החזר חודשי, סך הריבית ולוח סילוקין בסיסי למשכנתא.",
    },
    "password-checker": {
      title: "בודק סיסמאות",
      short: "חוזק הסיסמה וזמן פריצה משוער",
      description: "הבדיקה רצה בדפדפן בלבד — הסיסמה לא נשלחת לשרת.",
    },
    "speed-test": {
      title: "בודק מהירות אינטרנט",
      short: "מהירות, פינג וזמן תגובה",
      description: "בדיקת הורדה משוערת ופינג מול שרת קרוב.",
    },
    "qr-code": {
      title: "מחולל QR Code",
      short: "URL, Wi‑Fi, טלפון וכרטיס ביקור",
      description: "צרו קוד QR והורידו אותו לשימוש חוזר.",
    },
    "background-remover": {
      title: "הסרת רקע מתמונה",
      short: "העלאה וקבלת PNG שקוף",
      description: "הסרה מקומית של רקע בהיר/אחיד לתמונות עסקיות ורשתות חברתיות.",
    },
    "file-converter": {
      title: "ממיר קבצים",
      short: "JPG, PNG, WebP ועוד",
      description: "המרת תמונות בין פורמטים נפוצים ישירות בדפדפן.",
    },
    "pdf-viewer": {
      title: "PDF Viewer",
      short: "צפייה בקבצי PDF בדפדפן",
      description: "העלו קובץ PDF וצפו בו במקום — הקובץ נשאר במכשיר שלכם.",
    },
    "pdf-creator": {
      title: "PDF Creator",
      short: "מסמך עם לוגו וטקסט",
      description: "הכינו מסמך עם לוגו, טקסט ושדה אופי אופציונלי — והורידו PDF מיד.",
    },
    "ai-writer": {
      title: "AI לכתיבת טקסטים",
      short: "כותרות, פוסטים, מיילים ותיאורי מוצר",
      description: "כמה שימושים חינמיים ביום ליצירת טקסטים שיווקיים בעברית ובאנגלית.",
    },
    "bmi-calories": {
      title: "מחשבון קלוריות ו‑BMI",
      short: "צריכה יומית, BMI ומטרות משקל",
      description: "חישוב BMI, BMR וצריכה יומית מומלצת לפי פעילות.",
    },
    "unit-converter": {
      title: "ממיר יחידות ומטבעות",
      short: "ק״מ↔מייל, ק״ג↔ליברות, ₪↔$↔€",
      description: "המרות יחידות נפוצות ושערי מטבע משוערים.",
    },
  },
};

const EN: ToolsCopy = {
  hubTitle: "Useful tools",
  hubSubtitle: "Free calculators and utilities for everyday use",
  menuTitle: "Useful tools",
  openTool: "Open tool",
  backToTools: "All tools",
  backToBlog: "Back to blog",
  toolsNav: "Tools",
  disclaimer: "These tools provide estimates only and are not professional advice.",
  calculate: "Calculate",
  result: "Result",
  reset: "Reset",
  download: "Download",
  chooseImage: "Choose image",
  choosePdf: "Choose PDF",
  uploadLogo: "Upload logo",
  createPdf: "Create PDF",
  fixText: "Fix text",
  documentNature: "Document type",
  documentNatureHint: "Optional — e.g. quote, letter, certificate",
  documentText: "Document text",
  copy: "Copy",
  copied: "Copied",
  loading: "Loading…",
  error: "Something went wrong. Please try again.",
  tools: {
    "net-salary": {
      title: "Net salary calculator (Israel)",
      short: "Gross ↔ net salary estimate",
      description: "Estimate net pay using approximate Israeli income tax, National Insurance, and health tax brackets.",
    },
    mortgage: {
      title: "Mortgage calculator",
      short: "Monthly payment, interest, amortization",
      description: "Calculate monthly payments, total interest, and a basic amortization schedule.",
    },
    "password-checker": {
      title: "Password checker",
      short: "Strength and estimated crack time",
      description: "Runs entirely in your browser — the password is never sent to a server.",
    },
    "speed-test": {
      title: "Internet speed test",
      short: "Speed, ping, and latency",
      description: "Estimate download speed and ping against a nearby endpoint.",
    },
    "qr-code": {
      title: "QR Code generator",
      short: "URL, Wi‑Fi, phone, and vCard",
      description: "Create a QR code and download it for repeated use.",
    },
    "background-remover": {
      title: "Background remover",
      short: "Upload and get a transparent PNG",
      description: "Locally remove bright/uniform backgrounds for business and social images.",
    },
    "file-converter": {
      title: "File converter",
      short: "JPG, PNG, WebP and more",
      description: "Convert common image formats directly in your browser.",
    },
    "pdf-viewer": {
      title: "PDF Viewer",
      short: "View PDF files in the browser",
      description: "Upload a PDF and view it in place — the file stays on your device.",
    },
    "pdf-creator": {
      title: "PDF Creator",
      short: "Document with logo and text",
      description: "Build a document with a logo, text, and an optional document type — then download a PDF instantly.",
    },
    "ai-writer": {
      title: "AI text writer",
      short: "Headlines, posts, emails, product copy",
      description: "A few free daily uses to generate marketing text in Hebrew or English.",
    },
    "bmi-calories": {
      title: "Calories & BMI calculator",
      short: "Daily needs, BMI, and weight goals",
      description: "Calculate BMI, BMR, and recommended daily calories by activity level.",
    },
    "unit-converter": {
      title: "Unit & currency converter",
      short: "km↔mi, kg↔lb, ₪↔$↔€",
      description: "Common unit conversions and approximate currency rates.",
    },
  },
};

export function toolsCopy(locale: string): ToolsCopy {
  return locale === "en" ? EN : HE;
}
