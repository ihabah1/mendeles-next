import { editorialCopy } from "@/lib/blog/editorial-copy";

export function EditorialMasthead({
  articleCount,
  categoryCount,
  locale = "he",
}: {
  articleCount: number;
  categoryCount: number;
  locale?: string;
}) {
  const copy = editorialCopy(locale);
  const today = new Date().toLocaleDateString(locale === "en" ? "en-US" : "he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className={`flex flex-wrap items-end justify-between gap-4 ${locale === "en" ? "text-left" : "text-right"}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6F42F5]">{copy.mastheadKicker}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{copy.mastheadTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{copy.mastheadSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-center">
          <div className="min-w-[88px] rounded-xl bg-[#F7F8FC] px-4 py-3">
            <p className="text-2xl font-extrabold text-[#6F42F5]">{articleCount}</p>
            <p className="text-xs text-slate-500">{copy.articles}</p>
          </div>
          <div className="min-w-[88px] rounded-xl bg-[#F7F8FC] px-4 py-3">
            <p className="text-2xl font-extrabold text-[#6F42F5]">{categoryCount}</p>
            <p className="text-xs text-slate-500">{copy.categories}</p>
          </div>
          <div className={`min-w-[140px] rounded-xl bg-[#F7F8FC] px-4 py-3 ${locale === "en" ? "text-left" : "text-right"}`}>
            <p className="text-xs font-semibold text-slate-500">{copy.lastUpdate}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{today}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
