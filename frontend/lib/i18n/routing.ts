import { defineRouting } from "next-intl/routing";
import { SYSTEM_LOCALE_CODES } from "./system-locales";

export const routing = defineRouting({
  locales: [...SYSTEM_LOCALE_CODES],
  defaultLocale: "he",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
