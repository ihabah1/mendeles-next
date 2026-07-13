import type { BlogCategory } from "@/lib/blog/types";
import { contentPack } from "@/lib/i18n/locale-content";

const HE_LABELS: Record<string, string> = {
  law: "משפט ופלילי",
  real_estate: 'נדל"ן',
  insurance: "ביטוח",
  finance: "פיננסים",
  medical: "רפואה פרטית",
  dentistry: "רפואת שיניים",
  beauty: "יופי ואסתטיקה",
  fitness: "כושר ובריאות",
  home_services: "שירותים לבית",
  automotive: "רכב",
  education: "חינוך וקורסים",
  tourism: "תיירות ונופש",
  restaurants: "מסעדות ואוכל",
  ecommerce: "חנויות אונליין",
  b2b: "B2B ושירותים לעסקים",
  cyber: "סייבר וטכנולוגיה",
  marketing: "שיווק דיגיטלי",
  events: "אירועים",
  nonprofits: "עמותות",
  local_business: "עסקים מקומיים",
  sports: "ספורט",
  economy: "כלכלה",
  current_affairs: "אקטואליה",
  world_news: "בעולם",
  international_news: "תרגום חדשות בינלאומיות",
  seo: "קידום אתרים",
  "digital-marketing": "שיווק דיגיטלי",
  digital_marketing: "שיווק דיגיטלי",
  "ai-automation": "AI ואוטומציה",
  ai_automation: "AI ואוטומציה",
  news: "אקטואליה",
  business: "עסקים",
  general: "כללי",
};

const EN_LABELS: Record<string, string> = {
  law: "Law",
  real_estate: "Real Estate",
  insurance: "Insurance",
  finance: "Finance",
  medical: "Private Medicine",
  dentistry: "Dentistry",
  beauty: "Beauty & Aesthetics",
  fitness: "Fitness & Health",
  home_services: "Home Services",
  automotive: "Automotive",
  education: "Education & Courses",
  tourism: "Tourism & Travel",
  restaurants: "Restaurants & Food",
  ecommerce: "E-commerce",
  b2b: "B2B & Business Services",
  cyber: "Cyber & Technology",
  marketing: "Digital Marketing",
  events: "Events",
  nonprofits: "Nonprofits",
  local_business: "Local Business",
  sports: "Sports",
  economy: "Economy",
  current_affairs: "Current Affairs",
  world_news: "World News",
  international_news: "International News Translation",
  seo: "SEO",
  "digital-marketing": "Digital Marketing",
  digital_marketing: "Digital Marketing",
  "ai-automation": "AI & Automation",
  ai_automation: "AI & Automation",
  news: "News",
  business: "Business",
  general: "General",
};

const AR_LABELS: Record<string, string> = {
  law: "القانون والجنائي",
  real_estate: "العقارات",
  insurance: "التأمين",
  finance: "المالية",
  medical: "الطب الخاص",
  dentistry: "طب الأسنان",
  beauty: "الجمال والتجميل",
  fitness: "اللياقة والصحة",
  home_services: "خدمات المنزل",
  automotive: "السيارات",
  education: "التعليم والدورات",
  tourism: "السياحة والترفيه",
  restaurants: "المطاعم والطعام",
  ecommerce: "المتاجر الإلكترونية",
  b2b: "B2B وخدمات الأعمال",
  cyber: "الأمن السيبراني والتقنية",
  marketing: "التسويق الرقمي",
  events: "الفعاليات",
  nonprofits: "الجمعيات",
  local_business: "أعمال محلية",
  sports: "رياضة",
  economy: "اقتصاد",
  current_affairs: "أخبار عاجلة",
  world_news: "العالم",
  international_news: "ترجمة أخبار دولية",
  seo: "تحسين محركات البحث",
  "digital-marketing": "التسويق الرقمي",
  digital_marketing: "التسويق الرقمي",
  "ai-automation": "الذكاء الاصطناعي والأتمتة",
  ai_automation: "الذكاء الاصطناعي والأتمتة",
  news: "أخبار",
  business: "أعمال",
  general: "عام",
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function localizeBlogCategory(slug: string, locale: string, _fallback = ""): string {
  if (!slug) return "";
  const key = normalizeSlug(slug);
  const pack = contentPack(locale);
  const labels = pack === "en" ? EN_LABELS : pack === "ar" ? AR_LABELS : HE_LABELS;
  return labels[key] ?? labels[slug.toLowerCase()] ?? key.replace(/_/g, " ");
}

export function localizeBlogCategories(categories: BlogCategory[], locale: string): BlogCategory[] {
  return categories.map((item) => ({
    ...item,
    name: localizeBlogCategory(item.slug, locale, item.name),
  }));
}

export function defaultNavCategories(locale: string): BlogCategory[] {
  const slugs = ["world_news", "sports", "law", "economy", "current_affairs", "automotive"];
  return slugs.map((slug) => ({
    slug,
    name: localizeBlogCategory(slug, locale),
    count: 0,
  }));
}
