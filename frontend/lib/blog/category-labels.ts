import type { BlogCategory } from "@/lib/blog/types";

const HE_LABELS: Record<string, string> = {
  law: "עריכת דין",
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
  seo: "SEO",
  "digital-marketing": "Digital Marketing",
  digital_marketing: "Digital Marketing",
  "ai-automation": "AI & Automation",
  ai_automation: "AI & Automation",
  news: "News",
  business: "Business",
  general: "General",
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function localizeBlogCategory(slug: string, locale: string, fallback = ""): string {
  if (!slug) return fallback;
  const key = normalizeSlug(slug);
  const labels = locale === "en" ? EN_LABELS : HE_LABELS;
  return labels[key] ?? labels[slug.toLowerCase()] ?? fallback ?? slug;
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
