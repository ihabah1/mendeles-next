/**
 * Map any system locale to the UI/content pack we actually ship (he / en / ar).
 * New locales (es, de, zh, …) use the English pack until fully translated.
 */
export type ContentPack = "he" | "en" | "ar";

export function contentPack(locale: string): ContentPack {
  if (locale === "he") return "he";
  if (locale === "ar") return "ar";
  return "en";
}

export function isRtlLocale(locale: string): boolean {
  return locale === "he" || locale === "ar";
}

/** Prefer English UI strings for every non-Hebrew locale when only he/en copy exists. */
export function pickHeEn<T>(locale: string, he: T, en: T): T {
  return contentPack(locale) === "he" ? he : en;
}

export function textAlignClass(locale: string): "text-left" | "text-right" {
  return isRtlLocale(locale) ? "text-right" : "text-left";
}
