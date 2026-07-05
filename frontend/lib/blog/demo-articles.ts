import type { BlogCardPost, BlogCategory } from "@/lib/blog/types";
import { pickCuratedPhoto } from "@/lib/blog/stock-photos";

type DemoArticle = {
  id: string;
  slug: string;
  locale: "he" | "en";
  title: string;
  meta_description: string;
  category: string;
  category_slug: string;
  reading_minutes: number;
  days_ago: number;
  preview_body: string;
};

const DEMO_CATEGORIES_HE: BlogCategory[] = [
  { slug: "seo", name: "SEO", count: 4 },
  { slug: "digital-marketing", name: "שיווק דיגיטלי", count: 3 },
  { slug: "ai-automation", name: "AI ואוטומציה", count: 3 },
  { slug: "finance", name: "פיננסים", count: 2 },
  { slug: "business", name: "עסקים", count: 2 },
  { slug: "news", name: "אקטואליה", count: 2 },
  { slug: "sports", name: "ספורט", count: 1 },
];

const DEMO_CATEGORIES_EN: BlogCategory[] = [
  { slug: "seo", name: "SEO", count: 4 },
  { slug: "digital-marketing", name: "Digital Marketing", count: 3 },
  { slug: "ai-automation", name: "AI & Automation", count: 3 },
  { slug: "finance", name: "Finance", count: 2 },
  { slug: "business", name: "Business", count: 2 },
  { slug: "news", name: "News", count: 2 },
  { slug: "sports", name: "Sports", count: 1 },
];

const DEMO_ARTICLES: DemoArticle[] = [
  {
    id: "demo-he-1",
    slug: "ai-seo-strategy-2026",
    locale: "he",
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
    id: "demo-en-1",
    slug: "ai-seo-strategy-2026",
    locale: "en",
    title: "Complete Guide: Building an AI-Powered SEO Strategy for 2026",
    meta_description:
      "How to combine keyword research, automation, and smart content to build an organic growth engine that generates leads consistently.",
    category: "SEO",
    category_slug: "seo",
    reading_minutes: 12,
    days_ago: 1,
    preview_body:
      "SEO has changed. Search engines now reward depth, real data, and user experience. This guide breaks the process into research, planning, production, measurement, and iterative AI optimization.",
  },
  {
    id: "demo-he-2",
    slug: "keyword-research-framework",
    locale: "he",
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
    id: "demo-en-2",
    slug: "keyword-research-framework",
    locale: "en",
    title: "A Keyword Research Framework That Delivers Results in 48 Hours",
    meta_description: "A practical method to find high-volume, low-competition search opportunities without analysis paralysis.",
    category: "SEO",
    category_slug: "seo",
    reading_minutes: 8,
    days_ago: 2,
    preview_body:
      "The most common mistake is starting with guesses. Pull data from GSC, Trends, and competitor tools, then filter by intent, content depth, and conversion potential.",
  },
  {
    id: "demo-he-3",
    slug: "landing-page-conversion",
    locale: "he",
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
    id: "demo-en-3",
    slug: "landing-page-conversion",
    locale: "en",
    title: "7 Principles for Landing Pages That Turn Cold Traffic into Warm Leads",
    meta_description: "From hero to CTA — how to build a page that speaks the customer's language and drives action.",
    category: "Digital Marketing",
    category_slug: "digital-marketing",
    reading_minutes: 7,
    days_ago: 3,
    preview_body:
      "A great landing page is not just pretty — it is a persuasion system. Sharp headline, social proof, clear value, fast load, and a short form separate 1% conversion from 8%.",
  },
  {
    id: "demo-he-4",
    slug: "google-analytics-4-guide",
    locale: "he",
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
    id: "demo-en-4",
    slug: "google-analytics-4-guide",
    locale: "en",
    title: "GA4 for Business: The Metrics That Actually Matter",
    meta_description: "Move beyond pageviews: events, user journeys, and ROI measurement in digital marketing.",
    category: "Digital Marketing",
    category_slug: "digital-marketing",
    reading_minutes: 9,
    days_ago: 4,
    preview_body:
      "GA4 shows not only how many people arrived, but what they did next. Define lead events, connect campaigns with UTMs, and build reports that link content to revenue.",
  },
  {
    id: "demo-he-5",
    slug: "ai-content-workflow",
    locale: "he",
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
    id: "demo-en-5",
    slug: "ai-content-workflow",
    locale: "en",
    title: "An AI Content Workflow That Does Not Sound Robotic",
    meta_description: "How to combine Gemini, human editing, and market research to produce credible, original articles.",
    category: "AI & Automation",
    category_slug: "ai-automation",
    reading_minutes: 10,
    days_ago: 5,
    preview_body:
      "AI is an accelerator, not a replacement for editors. Steps: research brief, structured draft, verified facts, brand voice editing, and SEO checks before publish.",
  },
  {
    id: "demo-he-6",
    slug: "marketing-automation-playbook",
    locale: "he",
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
    id: "demo-en-6",
    slug: "marketing-automation-playbook",
    locale: "en",
    title: "Marketing Automation Playbook for Small Teams",
    meta_description: "Triggers, segmentation, and automated emails that increase closes without growing headcount.",
    category: "AI & Automation",
    category_slug: "ai-automation",
    reading_minutes: 11,
    days_ago: 6,
    preview_body:
      "Start with three flows: new lead welcome, interest-based nurture, and re-engagement for dormant contacts. Measure opens, clicks, and conversions — then improve weekly.",
  },
  {
    id: "demo-he-7",
    slug: "insurance-leads-digital",
    locale: "he",
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
    id: "demo-en-7",
    slug: "insurance-leads-digital",
    locale: "en",
    title: "How Insurance Companies Generate Quality Digital Leads",
    meta_description: "Promotion models, credible content, and regulatory compliance in competitive insurance markets.",
    category: "Finance",
    category_slug: "finance",
    reading_minutes: 6,
    days_ago: 7,
    preview_body:
      "In trust-sensitive markets, content must be accurate and transparent. Intent-focused service pages, simple calculators, and phone follow-up shorten the buying journey.",
  },
  {
    id: "demo-he-8",
    slug: "mortgage-content-strategy",
    locale: "he",
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
    id: "demo-en-8",
    slug: "mortgage-content-strategy",
    locale: "en",
    title: "Mortgage Content Strategy: What Customers Search on Google",
    meta_description: "Search intent analysis, calculators, and guides that bring quality inquiries to mortgage advisors.",
    category: "Finance",
    category_slug: "finance",
    reading_minutes: 8,
    days_ago: 8,
    preview_body:
      "Questions about financing, rates, taxes, and loan mixes are content opportunities. Every article should end with a clear CTA: consultation, comparison, or eligibility check.",
  },
  {
    id: "demo-he-9",
    slug: "local-business-seo",
    locale: "he",
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
    id: "demo-en-9",
    slug: "local-business-seo",
    locale: "en",
    title: "Local SEO for Businesses: From Google Maps to Neighborhood Leads",
    meta_description: "Google Business Profile, reviews, local service pages, and schema that improve map visibility.",
    category: "Business",
    category_slug: "business",
    reading_minutes: 7,
    days_ago: 9,
    preview_body:
      "Local businesses need consistent presence: name, address, phone, categories, photos, and review responses. This directly affects local search visibility.",
  },
  {
    id: "demo-he-10",
    slug: "b2b-lead-generation",
    locale: "he",
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
    id: "demo-en-10",
    slug: "b2b-lead-generation",
    locale: "en",
    title: "B2B: Turning Professional Content into a Lead Pipeline",
    meta_description: "Webinars, research, case studies, and comparison pages that speak to decision-makers.",
    category: "Business",
    category_slug: "business",
    reading_minutes: 9,
    days_ago: 10,
    preview_body:
      "In B2B, buyers purchase after trust. Show data, process, and real outcomes. Every content asset should lead to a strategy call or demo.",
  },
  {
    id: "demo-he-11",
    slug: "newsroom-seo",
    locale: "he",
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
    id: "demo-en-11",
    slug: "newsroom-seo",
    locale: "en",
    title: "Digital Newsroom: Covering Breaking Stories Without Hurting SEO",
    meta_description: "Publishing speed, accurate headlines, and article structure that holds performance over time.",
    category: "News",
    category_slug: "news",
    reading_minutes: 5,
    days_ago: 2,
    preview_body:
      "Good news SEO adds context, data, and internal links. Publish fast, then update the article as the story develops.",
  },
  {
    id: "demo-he-12",
    slug: "trends-to-content",
    locale: "he",
    title: "מטרנד בגוגל למאמר שמייצר תנועה תוך שעות",
    meta_description: "תהליך עבודה מחבר Trends, AI ופרסום מהיר לכיסוי נושאים חמים.",
    category: "אקטואליה",
    category_slug: "news",
    reading_minutes: 6,
    days_ago: 1,
    preview_body:
      "כשטרנד עולה, חלון ההזדמנות קצר. זהה נושא, אמת עובדות, פרסם תוך שעה, וקדם פנימית ממאמרים קשורים.",
  },
  {
    id: "demo-en-12",
    slug: "trends-to-content",
    locale: "en",
    title: "From Google Trend to Traffic-Generating Article in Hours",
    meta_description: "A workflow connecting Trends, AI, and fast publishing for hot topics.",
    category: "News",
    category_slug: "news",
    reading_minutes: 6,
    days_ago: 1,
    preview_body:
      "When a trend spikes, the window is short. Identify the topic, verify facts, publish within an hour, and promote internally from related articles.",
  },
  {
    id: "demo-he-sports-1",
    slug: "premier-league-title-race-translation",
    locale: "he",
    title: "תרגום כתבה: מרוץ האליפות בפרמייר ליג — ליברפול וארסנל נשארות בראש",
    meta_description:
      "תרגום ועריכה של כתבת ספורט בינלאומית על מרוץ האליפות באנגליה, עם הקשר לעונת 2025/26 ותמונת רוח של אצטדיון.",
    category: "ספורט",
    category_slug: "sports",
    reading_minutes: 5,
    days_ago: 0,
    preview_body:
      "לפי הדיווחים מחו\"ל, מרוץ האליפות בפרמייר ליג נשאר צמוד לאחר סיבוב נוסף. ליברפול הצליחה לנצל טעות הגנתית של היריבה ולהוביל בטבלה, בעוד ארסנל ממתינה להזדמנות בסיבוב הבא. הכתבה המתורגמת מדגישה את עומס המשחקים, פציעות בקו ההגנה ואת המאבק על כדור הרביעי בליגה האירופית.",
  },
  {
    id: "demo-en-sports-1",
    slug: "premier-league-title-race-translation",
    locale: "en",
    title: "Translated Report: Premier League Title Race — Liverpool and Arsenal Stay on Course",
    meta_description:
      "Translated and edited international football coverage of the English title race, with 2025/26 context and stadium atmosphere.",
    category: "Sports",
    category_slug: "sports",
    reading_minutes: 5,
    days_ago: 0,
    preview_body:
      "According to international match reports, the Premier League title race remains tight after another round. Liverpool capitalized on a defensive error to lead the table, while Arsenal wait for their next opening. The translated piece highlights fixture congestion, defensive injuries, and the battle for a top-four European spot.",
  },
];

function publishedDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function resolveLocale(locale: string): "he" | "en" {
  return locale === "en" ? "en" : "he";
}

function toCardPost(article: DemoArticle): BlogCardPost {
  return {
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
  };
}

export function getEditorialDemoPosts(locale = "he"): BlogCardPost[] {
  const lang = resolveLocale(locale);
  return DEMO_ARTICLES.filter((article) => article.locale === lang).map(toCardPost);
}

export function getEditorialDemoCategories(locale = "he"): BlogCategory[] {
  return resolveLocale(locale) === "en" ? DEMO_CATEGORIES_EN : DEMO_CATEGORIES_HE;
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

export function findDemoArticle(slug: string, locale = "he"): BlogCardPost | null {
  const lang = resolveLocale(locale);
  const article = DEMO_ARTICLES.find((item) => item.slug === slug && item.locale === lang);
  return article ? toCardPost(article) : null;
}

export function getSportsDemoPosts(locale = "he"): BlogCardPost[] {
  return getEditorialDemoPosts(locale).filter((post) => post.category_slug === "sports");
}
