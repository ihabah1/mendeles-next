import { defineRouting } from "next-intl/routing";
import { SYSTEM_LOCALE_CODES } from "./system-locales";

export const routing = defineRouting({
  locales: [...SYSTEM_LOCALE_CODES],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Don't auto-switch from Accept-Language — English until the user picks another locale.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
