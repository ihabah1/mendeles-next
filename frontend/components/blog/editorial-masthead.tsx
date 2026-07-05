export function EditorialMasthead({ articleCount, categoryCount }: { articleCount: number; categoryCount: number }) {
  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6F42F5]">Mendeles Insights</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">בלוג לצמיחה דיגיטלית</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            מדריכים, מחקרים ותובנות על SEO, שיווק, AI ואוטומציה — בדיוק כמו מגזין מקצועי לצוותי צמיחה.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-center">
          <div className="min-w-[88px] rounded-xl bg-[#F7F8FC] px-4 py-3">
            <p className="text-2xl font-extrabold text-[#6F42F5]">{articleCount}</p>
            <p className="text-xs text-slate-500">מאמרים</p>
          </div>
          <div className="min-w-[88px] rounded-xl bg-[#F7F8FC] px-4 py-3">
            <p className="text-2xl font-extrabold text-[#6F42F5]">{categoryCount}</p>
            <p className="text-xs text-slate-500">קטגוריות</p>
          </div>
          <div className="min-w-[140px] rounded-xl bg-[#F7F8FC] px-4 py-3 text-right">
            <p className="text-xs font-semibold text-slate-500">עדכון אחרון</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{today}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
