"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccessibility } from "@/lib/a11y/context";
import { cn } from "@/lib/utils";

function AccessibilityIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-2 6.5a1 1 0 1 1 0 2H9.2l-1.4 4.2-2.1-.7a1 1 0 1 1 .6-1.9l2.5.8a1 1 0 0 1 .7.9l.2 1.1H8.5a1 1 0 1 1 0-2h1.1l.3-1.1A1 1 0 0 1 10 8.5h2zm6.5 0a1 1 0 0 1 .9.6l.3 1.1H20a1 1 0 1 1 0 2h-1.6l.2-1.1a1 1 0 0 1 .7-.9l2.5-.8a1 1 0 0 1-.6-1.9l-2.1.7L17.8 8.5H16a1 1 0 0 1 0-2h1.5zM7 14.5a1 1 0 0 1 1 1v4.2l1.6 1.6a1 1 0 0 1-1.4 1.4l-2-2A1 1 0 0 1 6 19.7v-4.2a1 1 0 0 1 1-1zm10 0a1 1 0 0 1 1 1v4.2a1 1 0 0 1-.2.6l-2 2a1 1 0 1 1-1.4-1.4L16.5 19.7v-4.2a1 1 0 0 1 1-1z" />
    </svg>
  );
}

type ToggleKey = "highContrast" | "highlightLinks" | "readableFont" | "reduceMotion" | "underlineLinks";

export function AccessibilityWidget() {
  const t = useTranslations("a11y");
  const { prefs, increaseFont, decreaseFont, toggle, reset } = useAccessibility();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggles: { key: ToggleKey; label: string }[] = [
    { key: "highContrast", label: t("highContrast") },
    { key: "highlightLinks", label: t("highlightLinks") },
    { key: "underlineLinks", label: t("underlineLinks") },
    { key: "readableFont", label: t("readableFont") },
    { key: "reduceMotion", label: t("reduceMotion") },
  ];

  return (
    <div className="fixed bottom-4 start-4 z-[100] flex flex-col items-start gap-2">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={t("panelTitle")}
          className="w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-2xl"
        >
          <h2 className="text-base font-bold">{t("panelTitle")}</h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("panelDesc")}</p>

          <div className="mt-4">
            <p className="text-sm font-medium">{t("fontSize")}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={decreaseFont}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-lg font-bold hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t("decreaseFont")}
              >
                A−
              </button>
              <span className="min-w-[3rem] text-center text-sm font-semibold" aria-live="polite">
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

          <ul className="mt-4 space-y-2" role="list">
            {toggles.map(({ key, label }) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--muted)]">
                  <input
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

          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="mt-4 w-full rounded-lg border border-[var(--border)] py-2 text-sm font-medium hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {t("reset")}
          </button>

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted-fg)]">{t("statement")}</p>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("closePanel") : t("openPanel")}
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
