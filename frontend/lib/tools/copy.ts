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
  designText: string;
  designHeading: string;
  designParagraphs: string;
  designNumberSections: string;
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
  fixText: "מתקן טקסט",
  designText: "Design text",
  designHeading: "מדגיש כותרת",
  designParagraphs: "פסקאות",
  designNumberSections: "מספר סעיפים",
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
    "pdf-editor": {
      title: "PDF Editor",
      short: "עריכת PDF — טקסט, עמוד שער ומחיקה",
      description: "העלו PDF, הוסיפו כותרת/הערות, מחקו עמודים והורידו גרסה מעודכנת — הכול במכשיר שלכם.",
    },
    "logo-creator": {
      title: "Logo Creator",
      short: "יצירת לוגו מהיר לעסק",
      description: "צרו לוגו פשוט עם שם, צבעים וסגנון — והורידו PNG מיד.",
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
  designText: "Design text",
  designHeading: "Emphasize heading",
  designParagraphs: "Paragraphs",
  designNumberSections: "Number sections",
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
    "pdf-editor": {
      title: "PDF Editor",
      short: "Edit PDF — text, cover, delete pages",
      description: "Upload a PDF, add a title/notes, remove pages, and download an updated file — all on your device.",
    },
    "logo-creator": {
      title: "Logo Creator",
      short: "Quick business logo maker",
      description: "Create a simple logo with name, colors, and style — then download a PNG instantly.",
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

const AR: ToolsCopy = {
  hubTitle: "أدوات مفيدة",
  hubSubtitle: "حاسبات وأدوات مجانية للاستخدام اليومي بالعربية",
  menuTitle: "أدوات مفيدة",
  openTool: "فتح الأداة",
  backToTools: "كل الأدوات",
  backToBlog: "العودة إلى المدونة",
  toolsNav: "أدوات",
  disclaimer: "الأدوات مخصصة للتقدير العام فقط ولا تُعد استشارة مهنية.",
  calculate: "احسب",
  result: "النتيجة",
  reset: "إعادة تعيين",
  download: "تنزيل",
  chooseImage: "اختر صورة",
  choosePdf: "اختر PDF",
  uploadLogo: "رفع شعار",
  createPdf: "إنشاء PDF",
  fixText: "تصحيح النص",
  designText: "Design text",
  designHeading: "إبراز العنوان",
  designParagraphs: "فقرات",
  designNumberSections: "ترقيم البنود",
  documentNature: "طبيعة المستند",
  documentNatureHint: "اختياري — مثل عرض سعر، رسالة، إقرار",
  documentText: "نص المستند",
  copy: "نسخ",
  copied: "تم النسخ",
  loading: "جارٍ التحميل…",
  error: "حدث خطأ. حاول مرة أخرى.",
  tools: {
    "net-salary": {
      title: "حاسبة الراتب الصافي (إسرائيل)",
      short: "تقدير إجمالي ↔ صافي",
      description: "تقدير الراتب الصافي وفق ضريبة الدخل والتأمين الوطني وضريبة الصحة — وفق شرائح تقريبية.",
    },
    mortgage: {
      title: "حاسبة الرهن العقاري",
      short: "قسط شهري، فائدة وجدول سداد",
      description: "احسب القسط الشهري وإجمالي الفائدة وجدول سداد أساسي للرهن العقاري.",
    },
    "password-checker": {
      title: "فاحص كلمات المرور",
      short: "قوة كلمة المرور وزمن الاختراق التقريبي",
      description: "الفحص يعمل في المتصفح فقط — لا تُرسل كلمة المرور إلى الخادم.",
    },
    "speed-test": {
      title: "اختبار سرعة الإنترنت",
      short: "السرعة، البنغ والتأخير",
      description: "قدّر سرعة التنزيل والبنغ مقابل نقطة نهاية قريبة.",
    },
    "qr-code": {
      title: "مولّد رمز QR",
      short: "رابط، Wi‑Fi، هاتف وبطاقة vCard",
      description: "أنشئ رمز QR ونزّله للاستخدام المتكرر.",
    },
    "background-remover": {
      title: "إزالة الخلفية",
      short: "ارفع واحصل على PNG شفاف",
      description: "أزل الخلفيات الفاتحة/الموحّدة محلياً لصور الأعمال والشبكات.",
    },
    "file-converter": {
      title: "محوّل الملفات",
      short: "JPG وPNG وWebP والمزيد",
      description: "حوّل صيغ الصور الشائعة مباشرة في المتصفح.",
    },
    "pdf-viewer": {
      title: "عارض PDF",
      short: "عرض ملفات PDF في المتصفح",
      description: "ارفع ملف PDF واعرضه في المكان — يبقى الملف على جهازك.",
    },
    "pdf-creator": {
      title: "منشئ PDF",
      short: "مستند بشعار ونص",
      description: "أنشئ مستنداً بشعار ونص ونوع اختياري — ثم نزّل PDF فوراً.",
    },
    "pdf-editor": {
      title: "محرر PDF",
      short: "تعديل PDF — نص وغطاء وحذف صفحات",
      description: "ارفع PDF، أضف عنواناً/ملاحظات، احذف صفحات ونزّل نسخة محدّثة — كل ذلك على جهازك.",
    },
    "logo-creator": {
      title: "منشئ الشعارات",
      short: "شعار سريع للأعمال",
      description: "أنشئ شعاراً بسيطاً بالاسم والألوان والأسلوب — ثم نزّل PNG فوراً.",
    },
    "ai-writer": {
      title: "كاتب نصوص بالذكاء الاصطناعي",
      short: "عناوين، منشورات، رسائل، نصوص منتجات",
      description: "استخدامات مجانية يومية محدودة لإنشاء نصوص تسويقية بالعربية أو العبرية أو الإنجليزية.",
    },
    "bmi-calories": {
      title: "حاسبة السعرات ومؤشر كتلة الجسم",
      short: "الاحتياج اليومي وBMI وأهداف الوزن",
      description: "احسب BMI وBMR والسعرات اليومية الموصى بها حسب النشاط.",
    },
    "unit-converter": {
      title: "محوّل الوحدات والعملات",
      short: "كم↔ميل، كغ↔رطل، ₪↔$↔€",
      description: "تحويلات وحدات شائعة وأسعار عملات تقريبية.",
    },
  },
};

export function toolsCopy(locale: string): ToolsCopy {
  if (locale === "en") return EN;
  if (locale === "ar") return AR;
  return HE;
}
