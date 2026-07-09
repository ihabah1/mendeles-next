"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { getContactSiteConfig, whatsappHref, type ContactSiteConfig } from "@/lib/contact/site-config";
import { focusFirstElement, useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { cn } from "@/lib/utils";

export function ContactWidget({ contact: contactProp }: { contact?: ContactSiteConfig }) {
  const t = useTranslations("contactWidget");
  const envConfig = getContactSiteConfig();
  const config: ContactSiteConfig = {
    phone: envConfig.phone || contactProp?.phone || "",
    email: envConfig.email || contactProp?.email || "",
    whatsappNumber: envConfig.whatsappNumber || contactProp?.whatsappNumber || "",
    whatsappMessage: envConfig.whatsappMessage || contactProp?.whatsappMessage || "Hello Mendeles",
  };
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const waLink = whatsappHref(config.whatsappNumber, config.whatsappMessage);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <div className="contact-widget-root fixed bottom-4 end-4 z-[9998] flex flex-col items-end gap-2">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="contact-widget-panel w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-2xl"
        >
          <h2 id={titleId} className="text-base font-bold">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-fg)]">{t("subtitle")}</p>

          <div className="mt-4 space-y-2">
            {config.phone && (
              <a
                href={`tel:${config.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
              >
                <span aria-hidden>📞</span>
                <span>{config.phone}</span>
              </a>
            )}
            {config.email && (
              <a
                href={`mailto:${config.email}`}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
              >
                <span aria-hidden>✉️</span>
                <span>{config.email}</span>
              </a>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                <span aria-hidden>💬</span>
                <span>{t("whatsapp")}</span>
              </a>
            )}
            <Link
              href="/#contact"
              className="flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              onClick={() => setOpen(false)}
            >
              {t("formCta")}
            </Link>
          </div>

          {!config.phone && !config.email && !waLink && process.env.NODE_ENV === "development" && (
            <p className="mt-3 text-xs text-[var(--muted-fg)]">{t("configureHint")}</p>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={open ? t("close") : t("open")}
        className={cn(
          "contact-widget-toggle flex h-14 min-w-14 items-center justify-center gap-1 rounded-full bg-[var(--accent)] px-4 text-white shadow-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/35",
          open && "ring-4 ring-[var(--accent)]/35",
        )}
      >
        <span className="text-xl" aria-hidden>
          💬
        </span>
        <span className="hidden text-sm font-semibold sm:inline">{t("label")}</span>
      </button>
    </div>,
    document.body,
  );
}
