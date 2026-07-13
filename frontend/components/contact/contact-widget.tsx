"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { WhatsAppIcon } from "@/components/contact/whatsapp-icon";
import { getContactSiteConfig, whatsappHref, type ContactSiteConfig } from "@/lib/contact/site-config";
import { publicLeadsApi } from "@/lib/api/public-leads";
import { focusFirstElement, useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { cn } from "@/lib/utils";

export function ContactWidget({
  contact: contactProp,
  stacked = false,
}: {
  contact?: ContactSiteConfig;
  stacked?: boolean;
}) {
  const t = useTranslations("contactWidget");
  const envConfig = getContactSiteConfig();
  const config: ContactSiteConfig = {
    phone: envConfig.phone || contactProp?.phone || "",
    email: envConfig.email || contactProp?.email || "",
    whatsappNumber: envConfig.whatsappNumber || contactProp?.whatsappNumber || "",
    whatsappMessage: envConfig.whatsappMessage || contactProp?.whatsappMessage || "Hello Mendeles",
  };
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "form">("menu");
  const [mounted, setMounted] = useState(false);
  const [formId, setFormId] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
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
    if (!open) {
      setView("menu");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "form") {
          setView("menu");
          return;
        }
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    focusFirstElement(panelRef.current);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, view]);

  useEffect(() => {
    if (!open || view !== "form" || formId) return;
    let cancelled = false;
    setFormLoading(true);
    setFormError("");
    publicLeadsApi
      .contactForm()
      .then((data) => {
        if (!cancelled) setFormId(data.id);
      })
      .catch(() => {
        if (!cancelled) setFormError(t("formLoadError"));
      })
      .finally(() => {
        if (!cancelled) setFormLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, view, formId, t]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "contact-widget-root fixed end-4 z-[9998] flex flex-col items-end gap-2",
        stacked ? "bottom-20" : "bottom-4",
      )}
    >
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="contact-widget-panel w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-2xl"
        >
          {view === "menu" ? (
            <>
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
                  <div className="space-y-1">
                    <a
                      href={`mailto:${config.email}`}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
                    >
                      <span aria-hidden>✉️</span>
                      <span className="break-all">{config.email}</span>
                    </a>
                    <p className="px-1 text-[11px] leading-snug text-[var(--muted-fg)]">{t("mailtoHint")}</p>
                  </div>
                )}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
                    <span>{t("whatsappBot")}</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t("formCta")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id={titleId} className="text-base font-bold">
                  {t("formTitle")}
                </h2>
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="rounded-md px-2 py-1 text-xs font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
              </div>
              <p className="mb-3 text-xs text-[var(--muted-fg)]">{t("formSubtitle")}</p>
              {formLoading ? <p className="text-sm text-[var(--muted-fg)]">{t("formLoading")}</p> : null}
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              {formId ? (
                <LeadCaptureForm
                  formId={formId}
                  pageUrl={typeof window !== "undefined" ? window.location.pathname : "/"}
                  className="text-sm"
                />
              ) : null}
              {config.email ? (
                <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] leading-snug text-[var(--muted-fg)]">
                  {t("mailtoAlt", { email: config.email })}
                </p>
              ) : null}
            </>
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
