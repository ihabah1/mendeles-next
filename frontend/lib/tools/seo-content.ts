import { contentPack } from "@/lib/i18n/locale-content";
import type { ToolSlug } from "./catalog";

export type ToolSeoContent = {
  keywords: string[];
  intro: string;
  benefits: string[];
  faq: Array<{ question: string; answer: string }>;
};

type Seed = {
  heKeywords: string[];
  enKeywords: string[];
  heAction: string;
  enAction: string;
  heBenefits: string[];
  enBenefits: string[];
};

const SEEDS: Record<ToolSlug, Seed> = {
  "net-salary": {
    heKeywords: ["מחשבון שכר נטו", "חישוב שכר נטו", "ברוטו נטו", "מחשבון משכורת", "מס הכנסה משכורת"],
    enKeywords: ["Israel net salary calculator", "gross to net Israel", "salary calculator Israel", "take home pay Israel"],
    heAction: "להעריך כמה כסף יישאר מהמשכורת אחרי מס הכנסה, ביטוח לאומי ומס בריאות",
    enAction: "estimate take-home pay after Israeli income tax, National Insurance, and health tax",
    heBenefits: ["חישוב מהיר של ברוטו מול נטו", "פירוט ניכויים משוער", "השוואת תרחישי שכר"],
    enBenefits: ["Quick gross-to-net estimate", "Approximate deduction breakdown", "Compare salary scenarios"],
  },
  mortgage: {
    heKeywords: ["מחשבון משכנתא", "חישוב החזר משכנתא", "החזר חודשי משכנתא", "ריבית משכנתא", "לוח סילוקין"],
    enKeywords: ["mortgage calculator", "monthly mortgage payment", "mortgage interest calculator", "amortization calculator"],
    heAction: "לחשב החזר חודשי, עלות ריבית ולוח סילוקין משוער לפני לקיחת משכנתא",
    enAction: "calculate monthly payments, total interest, and an estimated amortization schedule",
    heBenefits: ["החזר חודשי משוער", "עלות ריבית כוללת", "תצוגת לוח סילוקין"],
    enBenefits: ["Estimated monthly payment", "Total interest cost", "Basic amortization schedule"],
  },
  "password-checker": {
    heKeywords: ["בדיקת חוזק סיסמה", "בודק סיסמאות", "סיסמה חזקה", "זמן פריצת סיסמה", "אבטחת סיסמאות"],
    enKeywords: ["password strength checker", "test password strength", "strong password checker", "password crack time"],
    heAction: "לבדוק את חוזק הסיסמה וזמן הפריצה המשוער בלי לשלוח אותה לשרת",
    enAction: "check password strength and estimated crack time without sending it to a server",
    heBenefits: ["בדיקה מקומית בדפדפן", "משוב מיידי על חוזק", "המלצות לשיפור הסיסמה"],
    enBenefits: ["Runs locally in your browser", "Instant strength feedback", "Practical improvement tips"],
  },
  "speed-test": {
    heKeywords: ["בדיקת מהירות אינטרנט", "Speed Test", "בדיקת מהירות גלישה", "בדיקת פינג", "מהירות הורדה"],
    enKeywords: ["internet speed test", "broadband speed test", "download speed test", "ping test", "latency test"],
    heAction: "לבדוק מהירות הורדה, פינג וזמן תגובה של חיבור האינטרנט",
    enAction: "estimate internet download speed, ping, and connection latency",
    heBenefits: ["תוצאת מהירות מהירה", "מדידת פינג וזמן תגובה", "מתאים למחשב ולנייד"],
    enBenefits: ["Fast speed estimate", "Ping and latency measurement", "Works on desktop and mobile"],
  },
  "qr-code": {
    heKeywords: ["מחולל QR Code", "יצירת קוד QR", "QR חינם", "קוד QR ל-WiFi", "QR לכרטיס ביקור"],
    enKeywords: ["QR code generator", "free QR code maker", "WiFi QR code", "vCard QR generator", "URL QR code"],
    heAction: "ליצור קוד QR לקישור, Wi‑Fi, טלפון או כרטיס ביקור ולהוריד אותו כתמונה",
    enAction: "create downloadable QR codes for URLs, Wi-Fi, phone numbers, or contact cards",
    heBenefits: ["מספר סוגי QR שימושיים", "הורדה מיידית כתמונה", "ללא הרשמה"],
    enBenefits: ["Multiple useful QR formats", "Instant image download", "No registration required"],
  },
  "background-remover": {
    heKeywords: ["הסרת רקע מתמונה", "מוחק רקע", "רקע שקוף", "הפיכת תמונה ל-PNG", "הסרת רקע חינם"],
    enKeywords: ["background remover", "remove image background", "transparent PNG maker", "free background removal"],
    heAction: "להסיר רקע בהיר או אחיד מתמונה ולקבל קובץ PNG עם רקע שקוף",
    enAction: "remove bright or uniform image backgrounds and download a transparent PNG",
    heBenefits: ["עיבוד מקומי ומהיר", "PNG שקוף להורדה", "מתאים למוצר, לוגו ורשתות"],
    enBenefits: ["Fast local processing", "Transparent PNG download", "Useful for products, logos, and social posts"],
  },
  "file-converter": {
    heKeywords: ["ממיר קבצים", "המרת JPG ל-PNG", "המרת PNG ל-WebP", "ממיר תמונות", "המרת פורמט תמונה"],
    enKeywords: ["file converter", "JPG to PNG converter", "PNG to WebP", "image format converter", "convert images online"],
    heAction: "להמיר תמונות בין JPG, PNG, WebP ופורמטים נפוצים ישירות בדפדפן",
    enAction: "convert images between JPG, PNG, WebP, and other common formats in the browser",
    heBenefits: ["המרה ללא העלאה לשרת", "תמיכה בפורמטים נפוצים", "הורדה מיידית"],
    enBenefits: ["Browser-based conversion", "Common image formats", "Immediate download"],
  },
  "pdf-viewer": {
    heKeywords: ["פתיחת PDF", "צפייה ב-PDF", "PDF Viewer", "קורא PDF אונליין", "הצגת קובץ PDF"],
    enKeywords: ["PDF viewer online", "open PDF online", "browser PDF reader", "view PDF file"],
    heAction: "לפתוח ולצפות בקובצי PDF בדפדפן בלי להעלות אותם לשרת",
    enAction: "open and view PDF files in the browser without uploading them to a server",
    heBenefits: ["הקובץ נשאר במכשיר", "צפייה מהירה בדפדפן", "ללא התקנת תוכנה"],
    enBenefits: ["File stays on your device", "Fast browser preview", "No software installation"],
  },
  "pdf-creator": {
    heKeywords: ["יצירת PDF", "מחולל PDF", "הכנת מסמך PDF", "יצירת PDF עם לוגו", "PDF בעברית"],
    enKeywords: ["PDF creator", "create PDF online", "PDF document maker", "create PDF with logo", "free PDF generator"],
    heAction: "ליצור מסמך PDF מעוצב עם כותרת, פסקאות, לוגו ומספור סעיפים",
    enAction: "create a formatted PDF document with headings, paragraphs, a logo, and numbered sections",
    heBenefits: ["עיצוב טקסט למסמך", "אפשרות להוספת לוגו", "הורדת PDF מיידית"],
    enBenefits: ["Document text formatting", "Optional logo upload", "Instant PDF download"],
  },
  "pdf-editor": {
    heKeywords: ["עריכת PDF", "עורך PDF אונליין", "הוספת טקסט ל-PDF", "מחיקת עמודים PDF", "עריכת קובץ PDF"],
    enKeywords: ["PDF editor online", "edit PDF", "add text to PDF", "delete PDF pages", "free PDF editor"],
    heAction: "לערוך PDF, להוסיף כותרת והערות, ליצור עמוד שער ולמחוק עמודים",
    enAction: "edit a PDF, add titles and notes, create a cover page, and remove pages",
    heBenefits: ["הוספת טקסט ועמוד שער", "מחיקת עמודים", "הקובץ מעובד במכשיר"],
    enBenefits: ["Add text and a cover page", "Remove unwanted pages", "Processing stays on your device"],
  },
  "pdf-sign": {
    heKeywords: ["חתימה על PDF", "חתימה דיגיטלית PDF", "הוספת חתימה ל-PDF", "חתימה אונליין", "לחתום על מסמך PDF"],
    enKeywords: ["sign PDF online", "add signature to PDF", "PDF signature tool", "draw signature on PDF"],
    heAction: "להוסיף חתימה מצוירת או שם מוקלד למסמך PDF ולבחור את מיקום החתימה",
    enAction: "add a drawn signature or typed name to a PDF and choose its placement",
    heBenefits: ["ציור חתימה או הקלדת שם", "בחירת עמוד ומיקום", "הורדת הקובץ החתום"],
    enBenefits: ["Draw or type a signature", "Choose page and placement", "Download the signed document"],
  },
  "logo-creator": {
    heKeywords: ["יצירת לוגו", "מחולל לוגו", "עיצוב לוגו לעסק", "לוגו חינם", "יצירת לוגו PNG"],
    enKeywords: ["logo maker", "free logo creator", "business logo generator", "create logo PNG", "online logo design"],
    heAction: "ליצור לוגו פשוט לעסק עם שם, צבעים וסגנון ולהוריד אותו כ-PNG",
    enAction: "create a simple business logo with a name, colors, and style, then download it as PNG",
    heBenefits: ["בחירת צבע וסגנון", "תצוגה מקדימה מיידית", "הורדת PNG לשימוש עסקי"],
    enBenefits: ["Choose colors and style", "Instant preview", "Download a business-ready PNG"],
  },
  "ai-writer": {
    heKeywords: ["כתיבת תוכן AI", "מחולל טקסט AI", "כתיבת פוסטים", "כתיבה שיווקית", "בינה מלאכותית לכתיבה"],
    enKeywords: ["AI writer", "AI text generator", "marketing copy generator", "AI post writer", "AI content writing"],
    heAction: "ליצור כותרות, פוסטים, מיילים ותיאורי מוצר בעזרת בינה מלאכותית",
    enAction: "generate headlines, social posts, emails, and product descriptions with AI",
    heBenefits: ["מספר סוגי תוכן", "כתיבה בעברית ובאנגלית", "טיוטה שיווקית תוך שניות"],
    enBenefits: ["Multiple content formats", "Hebrew and English writing", "Marketing draft in seconds"],
  },
  "bmi-calories": {
    heKeywords: ["מחשבון BMI", "מחשבון קלוריות", "חישוב BMR", "צריכת קלוריות יומית", "מחשבון משקל תקין"],
    enKeywords: ["BMI calculator", "calorie calculator", "BMR calculator", "daily calorie needs", "healthy weight calculator"],
    heAction: "לחשב BMI, חילוף חומרים בסיסי וצריכת קלוריות יומית לפי רמת פעילות",
    enAction: "calculate BMI, basal metabolic rate, and daily calorie needs by activity level",
    heBenefits: ["חישוב BMI ו-BMR", "הערכת קלוריות יומית", "התאמה לרמת פעילות"],
    enBenefits: ["BMI and BMR results", "Daily calorie estimate", "Activity-level adjustment"],
  },
  "unit-converter": {
    heKeywords: ["ממיר יחידות", "המרת קילומטר למייל", "המרת קילוגרם לליברה", "ממיר מטבעות", "המרת מידות"],
    enKeywords: ["unit converter", "km to miles converter", "kg to pounds", "currency converter", "measurement converter"],
    heAction: "להמיר מרחק, משקל, טמפרטורה ומטבעות ביחידות נפוצות",
    enAction: "convert common distance, weight, temperature, and currency values",
    heBenefits: ["המרות יחידות נפוצות", "חישוב מיידי לשני הכיוונים", "ממשק פשוט ומהיר"],
    enBenefits: ["Common measurement conversions", "Instant two-way calculation", "Simple, fast interface"],
  },
};

export function toolSeoContent(locale: string, slug: ToolSlug, title: string): ToolSeoContent {
  const seed = SEEDS[slug];
  const isHe = contentPack(locale) === "he";
  const keywords = isHe ? seed.heKeywords : seed.enKeywords;
  const action = isHe ? seed.heAction : seed.enAction;
  const benefits = isHe ? seed.heBenefits : seed.enBenefits;

  if (isHe) {
    return {
      keywords,
      intro: `${title} הוא כלי חינמי ונוח שמאפשר ${action}. הכלי פועל ישירות בדפדפן, ללא הרשמה, ומתאים לשימוש מהיר במחשב ובטלפון.`,
      benefits,
      faq: [
        { question: `האם ${title} חינמי?`, answer: "כן. אפשר להשתמש בכלי ללא תשלום וללא פתיחת חשבון." },
        { question: "האם המידע שלי נשמר?", answer: "ברוב הפעולות העיבוד מתבצע בדפדפן. אין להזין מידע רגיש מעבר לנדרש להפעלת הכלי." },
        { question: `איך משתמשים ב${title}?`, answer: `מזינים או מעלים את הנתונים הנדרשים, מפעילים את הכלי ומקבלים תוצאה מיידית. ${benefits[0]}.` },
      ],
    };
  }

  return {
    keywords,
    intro: `${title} is a free, easy-to-use utility that helps you ${action}. It works directly in your browser, requires no registration, and is suitable for desktop and mobile use.`,
    benefits,
    faq: [
      { question: `Is ${title} free?`, answer: "Yes. You can use this tool without payment or account registration." },
      { question: "Is my information stored?", answer: "Most processing happens in your browser. Avoid entering sensitive information beyond what the tool requires." },
      { question: `How do I use ${title}?`, answer: `Enter or upload the requested information, run the tool, and get an immediate result. ${benefits[0]}.` },
    ],
  };
}
