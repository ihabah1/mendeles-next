"use client";

import { pickHeEn, isRtlLocale } from "@/lib/i18n/locale-content";

export function NewsletterCard({ locale = "he" }: { locale?: string }) {
  return (
    <section
      id="newsletter"
      className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${isRtlLocale(locale) ? "text-right" : "text-left"}`}
    >
      <h2 className="text-lg font-bold text-slate-900">
        {pickHeEn(locale, "קבלו עדכונים חדשים", "Get fresh updates")}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        {pickHeEn(
          locale,
          "מדריכים, מחקרים וכלים לצמיחה דיגיטלית — ישירות לתיבה.",
          "Guides, research, and growth tools — straight to your inbox.",
        )}
      </p>
      <form className="mt-5 space-y-3">
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#6F42F5]/40"
          placeholder={pickHeEn(locale, "הכניסו את האימייל שלכם", "Enter your email")}
          type="email"
        />
        <button
          type="button"
          className="w-full rounded-xl bg-[#6F42F5] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5a32d4]"
        >
          {pickHeEn(locale, "הרשמה", "Subscribe")}
        </button>
      </form>
    </section>
  );
}
