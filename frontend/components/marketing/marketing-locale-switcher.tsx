"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

const CYCLE: Locale[] = ["he", "en", "ar"];

export function MarketingLocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const idx = CYCLE.indexOf(locale);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    router.replace(pathname, { locale: next });
  }

  const labels: Record<Locale, string> = {
    he: t("hebrew"),
    en: t("english"),
    ar: t("arabic"),
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
        className,
      )}
      aria-label={t("language")}
    >
      <span aria-hidden="true">🌐</span>
      <span className="hidden sm:inline">{labels[locale] ?? locale}</span>
    </button>
  );
}
