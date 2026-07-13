"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { SYSTEM_LOCALES, systemLocaleLabel } from "@/lib/i18n/system-locales";
import { cn } from "@/lib/utils";

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
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const menuWidth = Math.max(200, rect.width);
      const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
      let left = isRtl ? rect.right - menuWidth : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 8);
      setMenuPos({ top, left, width: menuWidth });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  const triggerClass =
    variant === "marketing"
      ? "inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 text-sm text-white transition hover:bg-white/15"
      : "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]";

  const menu =
    open && mounted && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={t("language")}
            className="fixed z-[10000] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-xl"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width, minWidth: 200 }}
          >
            {SYSTEM_LOCALES.map((loc) => (
              <li key={loc.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === loc.code}
                  onClick={() => switchLocale(loc.code as Locale)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2.5 text-start text-sm hover:bg-slate-100",
                    locale === loc.code && "bg-[#6F42F5]/10 font-semibold text-[#6F42F5]",
                  )}
                >
                  <span>{loc.native}</span>
                  {locale === loc.code ? <span className="text-xs">✓</span> : null}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(triggerClass)}
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
      >
        <span aria-hidden className="text-base leading-none">
          🌐
        </span>
        <span className="max-w-[7rem] truncate">{systemLocaleLabel(locale)}</span>
        <span aria-hidden className={cn("text-[10px] opacity-70 transition", open && "rotate-180")}>
          ▼
        </span>
      </button>
      {menu}
    </div>
  );
}

export function LocaleSwitcher({ className }: { className?: string }) {
  return <LanguageDropdown className={className} variant="dashboard" />;
}

export function MarketingLocaleSwitcher({ className }: { className?: string }) {
  return <LanguageDropdown className={className} variant="marketing" />;
}
