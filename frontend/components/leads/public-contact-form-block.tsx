"use client";

import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

type Props = {
  formId: string;
  pageId: string;
  pageUrl: string;
  headline?: string;
  anchorId?: string;
};

export function PublicContactFormBlock({
  formId,
  pageId,
  pageUrl,
  headline,
  anchorId = "contact",
  light = false,
}: Props & { light?: boolean }) {
  return (
    <section
      id={anchorId}
      className={
        light
          ? "scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10"
          : "scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10"
      }
    >
      {headline ? (
        <h2
          className={
            light
              ? "mb-6 text-center text-2xl font-bold text-slate-900 sm:text-3xl"
              : "mb-6 text-center text-2xl font-bold text-white sm:text-3xl"
          }
        >
          {headline}
        </h2>
      ) : null}
      <div
        className={
          light
            ? "mx-auto max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-900"
            : "mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-950/50 p-6 text-white"
        }
      >
        <LeadCaptureForm formId={formId} pageId={pageId} pageUrl={pageUrl} />
      </div>
    </section>
  );
}
