import type { BlogCardPost, BlogCategory } from "@/lib/blog/types";
import { pickCuratedPhoto } from "@/lib/blog/stock-photos";

const DEMO_CATEGORIES: BlogCategory[] = [
  { slug: "seo", name: "SEO", count: 4 },
  { slug: "digital-marketing", name: "שיווק דיגיטלי", count: 3 },
  { slug: "ai-automation", name: "AI ואוטומציה", count: 3 },
  { slug: "finance", name: "פיננסים", count: 2 },
  { slug: "business", name: "עסקים", count: 2 },
  { slug: "news", name: "אקטואליה", count: 2 },
];

const DEMO_ARTICLES: Array<{
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  category: string;
  category_slug: string;
  reading_minutes: number;
  days_ago: number;
  preview_body: string;
}> = [
  {
    id: "demo-1",
    slug: "ai-seo-strategy-2026",
    title: "מדריך מלא: בניית אסטרטגיית SEO מבוססת AI לשנת 2026",
    meta_description:
      "איך לשלב מחקר מילות מפתח, אוטומציה ותוכן חכם כדי לבנות מנוע צמיחה אורגני שמייצר לידים באופן עקבי.",
    category: "SEO",
    category_slug: "seo",
    reading_minutes: 12,
    days_ago: 1,
    preview_body:
      "עולם ה-SEO השתנה. מנועי חיפוש מעריכים היום תוכן עמוק, נתונים אמיתיים וחוויית משתמש. במדריך זה נפרק את התהליך לשלבים: מחקר, תכנון, ייצור, מדידה ואופטימיזציה חוזרת עם AI.",
  },
  {
    id: "demo-2",
    slug: "keyword-research-framework",
    title: "מסגרת עבודה לחקר מילות מפתח שמביאה תוצאות תוך 48 שעות",
    meta_description: "שיטה מעשית לזיהוי הזדמנויות חיפוש עם נפח גבוה ותחרות נמוכה — בלי להיתקע בניתוחים.",
    category: "SEO",
    category_slug: "seo",
    reading_minutes: 8,
    days_ago: 2,
    preview_body:
      "הטעות הנפוצה ביותר היא להתחיל מניחושים. במקום זאת, אספו נתונים מ-GSC, Trends וכלים תחרותיים, ואז סננו לפי כוונת חיפוש, עומק תוכן ופוטנציאל המרה.",
  },
  {
    id: "demo-3",
    slug: "landing-page-conversion",
    title: "7 עקרונות לדפי נחיתה שממירים טראפיק קר ללידים חמים",
    meta_description: "מההירו ועד ה-CTA — איך לבנות דף שמדבר בשפת הלקוח ומוביל לפעולה.",
    category: "שיווק דיגיטלי",
    category_slug: "digital-marketing",
    reading_minutes: 7,
    days_ago: 3,
    preview_body:
      "דף נחיתה טוב הוא לא דף יפה — הוא מערכת שכנוע. כותרת חדה, הוכחה חברתית, תועלת ברורה, טעינה מהירה וטופס קצר הם המרכיבים שמפרידים בין 1% המרה ל-8%.",
  },
  {
    id: "demo-4",
    slug: "google-analytics-4-guide",
    title: "GA4 לעסקים: המדדים שבאמת צריך לעקוב אחריהם",
    meta_description: "מעבר מ-pageviews לתובנות: אירועים, מסעות משתמשים ומדידת ROI בשיווק דיגיטלי.",
    category: "שיווק דיגיטלי",
    category_slug: "digital-marketing",
    reading_minutes: 9,
    days_ago: 4,
    preview_body:
      "GA4 מאפשר לראות לא רק כמה אנשים הגיעו, אלא מה הם עשו אחר כך. הגדירו אירועי ליד, חיברו קמפיינים ל-UTM, ובנו דוחות שמקשרים בין תוכן להכנסות.",
  },
  {
    id: "demo-5",
    slug: "ai-content-workflow",
    title: "תהליך ייצור תוכן עם AI שלא נראה כמו רובוט",
    meta_description: "איך לשלב Gemini, עריכה אנושית ומחקר שוק כדי לייצר מאמרים אמינים ומקוריים.",
    category: "AI ואוטומציה",
    category_slug: "ai-automation",
    reading_minutes: 10,
    days_ago: 5,
    preview_body:
      "AI הוא מאיץ, לא תחליף לעורך. השלבים: בריף מחקר, טיוטה מובנית, עובדות מאומתות, עריכה לשפה מותגית, ובדיקת SEO לפני פרסום.",
  },
  {
    id: "demo-6",
    slug: "marketing-automation-playbook",
    title: "פלייבוק אוטומציה שיווקית לצוותים קטנים",
    meta_description: "טריגרים, סגמנטציה ומיילים אוטומטיים שמגדילים סגירות בלי להגדיל כותרות.",
    category: "AI ואוטומציה",
    category_slug: "ai-automation",
    reading_minutes: 11,
    days_ago: 6,
    preview_body:
      "התחילו מ-3 זרימות: ברכה לליד חדש, חימום לפי עניין, ורה-אנגייג' ללקוחות שקפאו. מדדו פתיחות, קליקים והמרות — ושפרו כל שבוע.",
  },
  {
    id: "demo-7",
    slug: "insurance-leads-digital",
    title: "איך חברות ביטוח מייצרות לידים איכותיים בדיגיטל",
    meta_description: "מודלים של קידום, תוכן אמין וציות רגולטורי בשוק הביטוח הישראלי.",
    category: "פיננסים",
    category_slug: "finance",
    reading_minutes: 6,
    days_ago: 7,
    preview_body:
      "בשוק רגיש לאמון, התוכן חייב להיות מדויק ושקוף. דפי שירות ממוקדי כוונה, מחשבונים פשוטים וליווי טלפוני מקצרים את מסע הרכישה.",
  },
  {
    id: "demo-8",
    slug: "mortgage-content-strategy",
    title: "אסטרטגיית תוכן למשכנתאות: מה הלקוחות מחפשים בגוגל",
    meta_description: "ניתוח כוונות חיפוש, מחשבונים ומדריכים שמביאים פניות איכותיות ליועצי משכנתא.",
    category: "פיננסים",
    category_slug: "finance",
    reading_minutes: 8,
    days_ago: 8,
    preview_body:
      "שאלות על מימון, ריבית, מס רכישה ותמהילים הן הזדמנויות תוכן. כל מאמר צריך לסיים ב-CTA ברור: ייעוץ, השוואה או בדיקת זכאות.",
  },
  {
    id: "demo-9",
    slug: "local-business-seo",
    title: "SEO מקומי לעסקים: מפתח גוגל ללידים מהשכונה",
    meta_description: "Google Business Profile, ביקורות, דפי שירות מקומיים וסכמות שמבליטות אתכם במפות.",
    category: "עסקים",
    category_slug: "business",
    reading_minutes: 7,
    days_ago: 9,
    preview_body:
      "עסק מקומי חייב נוכחות עקבית: שם, כתובת, טלפון, קטגוריות, תמונות ותגובות לביקורות. זה משפיע ישירות על הופעה בחיפוש מקומי.",
  },
  {
    id: "demo-10",
    slug: "b2b-lead-generation",
    title: "B2B: איך להפוך תוכן מקצועי לצינור לידים",
    meta_description: "וובינרים, מחקרים, case studies ודפי השוואה שמדברים למקבלי החלטות.",
    category: "עסקים",
    category_slug: "business",
    reading_minutes: 9,
    days_ago: 10,
    preview_body:
      "ב-B2B קונים אחרי אמון. הציגו נתונים, תהליכים ותוצאות אמיתיות. כל נכס תוכן צריך להוביל לשיחת אסטרטגיה או הדגמה.",
  },
  {
    id: "demo-11",
    slug: "newsroom-seo",
    title: "חדר חדשות דיגיטלי: איך לכסות אקטואליה בלי לפגוע ב-SEO",
    meta_description: "מהירות פרסום, כותרות מדויקות ומבנה מאמר שמחזיק ביצועים לאורך זמן.",
    category: "אקטואליה",
    category_slug: "news",
    reading_minutes: 5,
    days_ago: 2,
    preview_body:
      "חדשות טובות ב-SEO הן אלו שמוסיפות הקשר, נתונים וקישורים פנימיים. פרסמו מהר, אבל עדכנו את המאמר כשהתמונה מתבהרת.",
  },
  {
    id: "demo-12",
    slug: "trends-to-content",
    title: "מטרנד בגוגל למאמר שמייצר תנועה תוך שעות",
    meta_description: "תהליך עבודה מחבר Trends, AI ופרסום מהיר לכיסוי נושאים חמים.",
    category: "אקטואליה",
    category_slug: "news",
    reading_minutes: 6,
    days_ago: 1,
    preview_body:
      "כשטרנד עולה, חלון ההזדמנות קצר. זהה נושא, אמת עובדות, פרסם תוך שעה, וקדם פנימית ממאמרים קשורים.",
  },
];

function publishedDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

export function getEditorialDemoPosts(): BlogCardPost[] {
  return DEMO_ARTICLES.map((article) => ({
    id: article.id,
    title: article.title,
    full_path: `/blog?article=${article.slug}`,
    meta_description: article.meta_description,
    published_at: publishedDaysAgo(article.days_ago),
    image_url: pickCuratedPhoto(article.category, article.category_slug, article.id),
    category: article.category,
    category_slug: article.category_slug,
    reading_minutes: article.reading_minutes,
    is_preview: true,
    preview_body: article.preview_body,
  }));
}

export function getEditorialDemoCategories(): BlogCategory[] {
  return DEMO_CATEGORIES;
}

export function filterDemoPosts(
  posts: BlogCardPost[],
  { q = "", category = "" }: { q?: string; category?: string },
): BlogCardPost[] {
  let filtered = posts;
  if (category) {
    filtered = filtered.filter((post) => post.category_slug === category);
  }
  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    filtered = filtered.filter(
      (post) =>
        post.title.toLowerCase().includes(needle) ||
        post.meta_description.toLowerCase().includes(needle) ||
        post.category.toLowerCase().includes(needle),
    );
  }
  return filtered;
}

export function findDemoArticle(slug: string): BlogCardPost | null {
  return getEditorialDemoPosts().find((post) => post.full_path.endsWith(`article=${slug}`)) ?? null;
}
