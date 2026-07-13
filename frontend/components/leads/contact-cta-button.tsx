"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LeadCaptureForm } from "@/components/leads/lead-capture-form";
import { publicLeadsApi } from "@/lib/api/public-leads";
import { focusFirstElement, useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  formId?: string;
  pageId?: string;
  pageUrl?: string;
  className?: string;
  variant?: "dark" | "light" | "cyan";
};

export function ContactCtaButton({
  label,
  formId: formIdProp,
  pageId,
  pageUrl,
  className,
  variant = "dark",
}: Props) {
  const t = useTranslations("leads.capture");
  const [open, setOpen] = useState(false);
  const [formId, setFormId] = useState(formIdProp || "");
  const [loadError, setLoadError] = useState("");
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

  useEffect(() => {
    if (!open || formId) return;
    let cancelled = false;
    publicLeadsApi
      .contactForm()
      .then((data) => {
        if (!cancelled) setFormId(data.id);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : t("error");
          setLoadError(
            msg.toLowerCase().includes("not found")
              ? t("formUnavailable")
              : msg,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, formId, t]);

  const variantClass =
    variant === "cyan"
      ? "rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
      : variant === "light"
        ? "rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
        : "rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={cn("mt-6 inline-flex", variantClass, className)}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4" role="presentation">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-[min(100vw-2rem,28rem)] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-xl font-bold">
                {t("modalTitle")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label={t("close")}
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">{t("modalSubtitle")}</p>
            {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
            {!formId && !loadError ? <p className="text-sm text-slate-500">{t("loadingForm")}</p> : null}
            {formId ? (
              <LeadCaptureForm formId={formId} pageId={pageId} pageUrl={pageUrl} className="text-slate-900" />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
