/** Curated landscape editorial photography (Unsplash). No AI art. */
export const CURATED_EDITORIAL_PHOTOS: Record<string, string[]> = {
  seo: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  marketing: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  finance: [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  insurance: [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  medical: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  technology: [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  business: [
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  news: [
    "https://images.unsplash.com/photo-1504711434967-e33886168f5c?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  sports: [
    "https://images.unsplash.com/photo-1522778119026-d4a9106a5fa2?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
  default: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&h=900&q=80",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1600&h=900&q=80",
  ],
};

export const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  seo: ["keyword research", "analytics dashboard", "google search", "marketing office"],
  marketing: ["digital marketing", "analytics dashboard", "marketing office"],
  finance: ["insurance", "mortgage", "calculator", "bank"],
  insurance: ["insurance", "financial planning", "bank office"],
  economy: ["finance", "stock market", "bank", "calculator"],
  medical: ["doctor", "clinic", "healthcare office"],
  dentistry: ["dentist", "dental clinic", "healthcare"],
  technology: ["software developer", "laptop workspace", "cloud computing"],
  cyber: ["software developer", "laptop workspace", "cybersecurity office"],
  business: ["office meeting", "startup team", "business workspace"],
  b2b: ["office meeting", "business team", "corporate office"],
  sports: ["football stadium", "soccer match", "premier league", "sports reporter"],
  default: ["professional office", "business workspace", "laptop desk"],
};

const SLUG_ALIASES: Record<string, string> = {
  law: "business",
  "real-estate": "finance",
  real_estate: "finance",
  finance: "finance",
  insurance: "insurance",
  medical: "medical",
  dentistry: "medical",
  marketing: "seo",
  cyber: "technology",
  b2b: "business",
  economy: "finance",
  sports: "sports",
  current_affairs: "news",
  "current-affairs": "news",
  world_news: "news",
  "world-news": "news",
  education: "business",
  ecommerce: "business",
  local_business: "business",
};

const LABEL_ALIASES: Record<string, string> = {
  seo: "seo",
  "שיווק דיגיטלי": "seo",
  "קידום אתרים": "seo",
  פיננסים: "finance",
  כלכלה: "finance",
  ביטוח: "insurance",
  "רפואה פרטית": "medical",
  "רפואת שיניים": "medical",
  "סייבר וטכנולוגיה": "technology",
  "b2b ושירותים לעסקים": "business",
  עסקים: "business",
  אקטואליה: "news",
  ספורט: "sports",
  sports: "sports",
};

export function normalizeCategoryKey(category: string, slug = ""): string {
  const slugKey = SLUG_ALIASES[slug.toLowerCase()] ?? slug.toLowerCase().replace(/-/g, "_");
  if (CURATED_EDITORIAL_PHOTOS[slugKey]) return slugKey;
  const labelKey = LABEL_ALIASES[category.trim().toLowerCase()];
  if (labelKey) return labelKey;
  const lower = category.toLowerCase();
  if (lower.includes("seo") || lower.includes("שיווק")) return "seo";
  if (lower.includes("רפוא") || lower.includes("קלינ")) return "medical";
  if (lower.includes("פיננס") || lower.includes("כלכ") || lower.includes("ביטוח")) return "finance";
  if (lower.includes("טכנ") || lower.includes("סייבר")) return "technology";
  if (lower.includes("עסק") || lower.includes("b2b")) return "business";
  if (lower.includes("ספורט") || lower.includes("sport") || lower.includes("football")) return "sports";
  return "default";
}

export function searchQueriesForCategory(category: string, slug = ""): string[] {
  const key = normalizeCategoryKey(category, slug);
  return CATEGORY_SEARCH_QUERIES[key] ?? CATEGORY_SEARCH_QUERIES.default;
}

export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickCuratedPhoto(category: string, slug: string, seed: string): string {
  const key = normalizeCategoryKey(category, slug);
  const pool = CURATED_EDITORIAL_PHOTOS[key] ?? CURATED_EDITORIAL_PHOTOS.default;
  return pool[hashSeed(seed) % pool.length];
}
