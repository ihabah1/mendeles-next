"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_ORDER: Locale[] = ["he", "en", "ar"];

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  const labels: Record<Locale, string> = {
    he: t("hebrew"),
    en: t("english"),
    ar: t("arabic"),
  };

  return (
    <div
      className={cn("inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm", className)}
      role="group"
      aria-label={t("language")}
    >
      {LOCALE_ORDER.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          className={cn(
            "rounded px-2.5 py-1 transition-colors",
            locale === code ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--muted)]",
          )}
          aria-pressed={locale === code}
        >
          {labels[code]}
        </button>
      ))}
    </div>
  );
}
