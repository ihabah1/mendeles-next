import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { routing, type Locale } from "@/lib/i18n/routing";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AccessibilityProvider } from "@/lib/a11y/context";
import { EARLY_A11Y_SCRIPT } from "@/lib/a11y/preferences";
import { SiteAccessibilityShell } from "@/components/a11y/site-accessibility-shell";
import { SiteContactShell, WhatsAppChatShell } from "@/components/contact/site-contact-shell";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { AnalyticsRouteTracker } from "@/components/analytics/analytics-route-tracker";
import { Providers } from "../providers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "he" || locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
      </head>
      <body>
        <Suspense fallback={null}>
          <AnalyticsRouteTracker />
        </Suspense>
        <script dangerouslySetInnerHTML={{ __html: EARLY_A11Y_SCRIPT }} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <AccessibilityProvider>
                <AuthProvider>{children}</AuthProvider>
                <WhatsAppChatShell />
                <SiteContactShell />
                <SiteAccessibilityShell />
              </AccessibilityProvider>
            </Providers>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
