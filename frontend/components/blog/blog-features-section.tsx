const FEATURES = [
  {
    title: "קהילה מקצועית",
    description: "תובנות, דיונים וידע מעשי לצוותי שיווק וצמיחה.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "כלים מומלצים",
    description: "המלצות על כלים, אוטומציה ו-AI לשיפור ביצועים.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinejoin="round" />
        <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "מחקר ועדכונים",
    description: "טרנדים, נתונים וניתוחים עדכניים מהשטח.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "מדריכים מעשיים",
    description: "הוראות צעד-אחר-צעד ליישום מהיר בתוך הארגון.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function BlogFeaturesSection() {
  return (
    <section className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-xl font-bold text-slate-900">תובנות ועדכונים</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-slate-100 bg-[#f8f9fa] p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#5e35b1]/10 text-[#5e35b1]">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
