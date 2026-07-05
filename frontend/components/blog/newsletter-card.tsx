export function NewsletterCard({ locale = "he" }: { locale?: string }) {
  const en = locale === "en";
  return (
    <section
      id="newsletter"
      className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6F42F5]/10 text-[#6F42F5]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16v16H4z" strokeLinejoin="round" />
          <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{en ? "Get fresh updates" : "קבלו עדכונים חדשים"}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        {en ? "Guides, research, and growth tools — straight to your inbox." : "מדריכים, מחקרים וכלים לצמיחה דיגיטלית — ישירות לתיבה."}
      </p>
      <form className="mt-5 space-y-3">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400/40"
          placeholder={en ? "Enter your email" : "הכניסו את האימייל שלכם"}
          type="email"
        />
        <button
          className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"
          type="button"
        >
          {en ? "Subscribe now" : "הרשמו עכשיו"}
        </button>
      </form>
    </section>
  );
}
