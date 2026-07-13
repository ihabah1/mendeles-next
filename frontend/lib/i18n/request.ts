import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

async function loadMessages(locale: string) {
  try {
    return (await import(`./locales/${locale}.json`)).default;
  } catch {
    return (await import(`./locales/en.json`)).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
