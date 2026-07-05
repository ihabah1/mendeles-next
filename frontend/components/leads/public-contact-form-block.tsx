"use client";

import { LeadCaptureForm } from "@/components/leads/lead-capture-form";

type Props = {
  formId: string;
  pageId: string;
  pageUrl: string;
  headline?: string;
  anchorId?: string;
};

export function PublicContactFormBlock({ formId, pageId, pageUrl, headline, anchorId = "contact" }: Props) {
  return (
    <section
      id={anchorId}
      className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10"
    >
      {headline ? <h2 className="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">{headline}</h2> : null}
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-950/50 p-6 text-white">
        <LeadCaptureForm formId={formId} pageId={pageId} pageUrl={pageUrl} />
      </div>
    </section>
  );
}
