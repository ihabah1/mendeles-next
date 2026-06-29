"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  return (
    <div className={cn("inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm", className)} role="group" aria-label={t("language")}>
      <button
        type="button"
        onClick={() => switchLocale("he")}
        className={cn(
          "rounded px-2.5 py-1 transition-colors",
          locale === "he" ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--muted)]",
        )}
        aria-pressed={locale === "he"}
      >
        {t("hebrew")}
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={cn(
          "rounded px-2.5 py-1 transition-colors",
          locale === "en" ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--muted)]",
        )}
        aria-pressed={locale === "en"}
      >
        {t("english")}
      </button>
    </div>
  );
}
