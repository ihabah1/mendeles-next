"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_ORDER: Locale[] = ["he", "en", "ar"];

type Props = {
  className?: string;
  variant?: "dashboard" | "marketing";
};

export function LanguageDropdown({ className, variant = "dashboard" }: Props) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const labels: Record<Locale, string> = {
    he: t("hebrew"),
    en: t("english"),
    ar: t("arabic"),
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function switchLocale(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  const triggerClass =
    variant === "marketing"
      ? "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
      : "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-sm hover:bg-[var(--muted)]";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span aria-hidden className="text-base leading-none">
          🌐
        </span>
        <span className="hidden sm:inline">{labels[locale] ?? locale}</span>
        <span aria-hidden className="text-xs opacity-60">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute end-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg"
        >
          {LOCALE_ORDER.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={locale === code}
                onClick={() => switchLocale(code)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-[var(--muted)]",
                  locale === code && "bg-[var(--muted)] font-semibold text-[#6F42F5]",
                )}
              >
                {labels[code]}
                {locale === code ? <span className="text-xs">✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** @deprecated use LanguageDropdown */
export function LocaleSwitcher({ className }: { className?: string }) {
  return <LanguageDropdown className={className} variant="dashboard" />;
}

/** @deprecated use LanguageDropdown */
export function MarketingLocaleSwitcher({ className }: { className?: string }) {
  return <LanguageDropdown className={className} variant="marketing" />;
}
