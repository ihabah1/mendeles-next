export function NewsletterCard({ locale = "he" }: { locale?: string }) {
  const en = locale === "en";
  return (
    <section
      id="newsletter"
      className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${en ? "text-left" : "text-right"}`}
    >
      <h2 className="text-lg font-bold text-slate-900">{en ? "Get fresh updates" : "קבלו עדכונים חדשים"}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        {en ? "Guides, research, and growth tools — straight to your inbox." : "מדריכים, מחקרים וכלים לצמיחה דיגיטלית — ישירות לתיבה."}
      </p>
      <form className="mt-5 space-y-3">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#6F42F5]/40"
          placeholder={en ? "Enter your email" : "הכניסו את האימייל שלכם"}
          type="email"
        />
        <button
          className="w-full rounded-xl bg-[#6F42F5] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5a32d4]"
          type="button"
        >
          {en ? "Subscribe now" : "הרשמו עכשיו"}
        </button>
      </form>
    </section>
  );
}
