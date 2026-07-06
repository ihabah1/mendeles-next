"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useAccessibility } from "@/lib/a11y/context";
import { focusFirstElement, useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { cn } from "@/lib/utils";
import { AccessibilityIcon } from "@/components/a11y/accessibility-icon";

type ToggleKey = "highContrast" | "highlightLinks" | "readableFont" | "reduceMotion" | "underlineLinks";

export function AccessibilityWidget() {
  const t = useTranslations("a11y");
  const { prefs, increaseFont, decreaseFont, toggle, reset } = useAccessibility();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    focusFirstElement(panelRef.current);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggles: { key: ToggleKey; label: string; id: string }[] = [
    { key: "highContrast", label: t("highContrast"), id: `${panelId}-high-contrast` },
    { key: "highlightLinks", label: t("highlightLinks"), id: `${panelId}-highlight-links` },
    { key: "underlineLinks", label: t("underlineLinks"), id: `${panelId}-underline-links` },
    { key: "readableFont", label: t("readableFont"), id: `${panelId}-readable-font` },
    { key: "reduceMotion", label: t("reduceMotion"), id: `${panelId}-reduce-motion` },
  ];

  return (
    <div className="fixed bottom-4 start-4 z-[100] flex flex-col items-start gap-2">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-2xl"
        >
          <h2 id={titleId} className="text-base font-bold">
            {t("panelTitle")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("panelDesc")}</p>

          <div className="mt-4">
            <p id={`${panelId}-font-label`} className="text-sm font-medium">
              {t("fontSize")}
            </p>
            <div className="mt-2 flex items-center gap-2" role="group" aria-labelledby={`${panelId}-font-label`}>
              <button
                type="button"
                onClick={decreaseFont}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-lg font-bold hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t("decreaseFont")}
              >
                A−
              </button>
              <span className="min-w-[3rem] text-center text-sm font-semibold" aria-live="polite" aria-atomic="true">
                {Math.round(prefs.fontScale * 100)}%
              </span>
              <button
                type="button"
                onClick={increaseFont}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-lg font-bold hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t("increaseFont")}
              >
                A+
              </button>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {toggles.map(({ key, label, id }) => (
              <li key={key}>
                <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--muted)]">
                  <input
                    id={id}
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t("reset")}
            </button>
            <Link
              href="/accessibility"
              className="w-full rounded-lg border border-[var(--border)] py-2 text-center text-sm font-medium hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => setOpen(false)}
            >
              {t("statementLink")}
            </Link>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted-fg)]">{t("statement")}</p>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={open ? t("closePanel") : t("openPanel")}
        data-a11y-widget="toggle"
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300",
          open && "ring-4 ring-indigo-300",
        )}
      >
        <AccessibilityIcon />
      </button>
    </div>
  );
}
