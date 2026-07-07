import { editorialCopy } from "@/lib/blog/editorial-copy";

const FEATURE_ICONS = [
  (
    <svg key="guides" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg key="research" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg key="ai" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinejoin="round" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg key="community" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
    </svg>
  ),
] as const;

export function BlogFeaturesSection({ locale = "he" }: { locale?: string }) {
  const copy = editorialCopy(locale);

  return (
    <section className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.features.map((feature, index) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200/80 bg-[#F7F8FC] p-6 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6F42F5]/10 text-[#6F42F5]">
                {FEATURE_ICONS[index]}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
