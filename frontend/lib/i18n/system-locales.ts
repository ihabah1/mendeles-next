/**
 * Content / translation locales used across Mendeles
 * (site translations, CRM preferred language, language switcher).
 */
export const SYSTEM_LOCALES = [
  { code: "he", label: "עברית", native: "עברית" },
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Español", native: "Español" },
  { code: "ar", label: "العربية", native: "العربية" },
  { code: "de", label: "Deutsch", native: "Deutsch" },
  { code: "zh", label: "中文", native: "中文" },
  { code: "fr", label: "Français", native: "Français" },
  { code: "it", label: "Italiano", native: "Italiano" },
  { code: "pt", label: "Português", native: "Português" },
  { code: "ru", label: "Русский", native: "Русский" },
  { code: "ja", label: "日本語", native: "日本語" },
  { code: "ko", label: "한국어", native: "한국어" },
  { code: "hi", label: "हिन्दी", native: "हिन्दी" },
  { code: "tr", label: "Türkçe", native: "Türkçe" },
  { code: "pl", label: "Polski", native: "Polski" },
  { code: "nl", label: "Nederlands", native: "Nederlands" },
  { code: "uk", label: "Українська", native: "Українська" },
  { code: "ro", label: "Română", native: "Română" },
] as const;

export type SystemLocaleCode = (typeof SYSTEM_LOCALES)[number]["code"];

export const SYSTEM_LOCALE_CODES = SYSTEM_LOCALES.map((l) => l.code) as SystemLocaleCode[];

/** UI shell locales that have dedicated next-intl message packs (or EN fallback). */
export const UI_LOCALES = SYSTEM_LOCALE_CODES;

export function isSystemLocale(code: string): code is SystemLocaleCode {
  return (SYSTEM_LOCALE_CODES as readonly string[]).includes(code);
}

export function systemLocaleLabel(code: string): string {
  return SYSTEM_LOCALES.find((l) => l.code === code)?.native || code;
}
