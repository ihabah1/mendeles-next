import { isRtlLocale } from "@/lib/i18n/locale-content";
import { editorialCopy } from "@/lib/blog/editorial-copy";

export function EditorialMasthead({
  locale = "he",
}: {
  articleCount?: number;
  categoryCount?: number;
  locale?: string;
}) {
  const copy = editorialCopy(locale);

  return (
    <section className={`py-8 text-center sm:py-10 ${isRtlLocale(locale) ? "text-right sm:text-center" : "text-left sm:text-center"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#6F42F5]">{copy.mastheadKicker}</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{copy.mastheadTitle}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">{copy.mastheadSubtitle}</p>
    </section>
  );
}
