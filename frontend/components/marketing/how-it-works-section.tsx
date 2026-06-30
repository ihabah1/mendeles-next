import { getTranslations } from "next-intl/server";
import { HOW_IT_WORKS_KEYS } from "@/lib/marketing/content";

const STEP_ICONS: Record<(typeof HOW_IT_WORKS_KEYS)[number], string> = {
  search: "🔍",
  landingPage: "📄",
  visitor: "👤",
  qualification: "🤖",
  lead: "📋",
  customer: "✓",
};

export async function HowItWorksSection() {
  const t = await getTranslations("landing.howItWorks");

  return (
    <section id="how-it-works" className="border-t border-[var(--border)] px-6 py-20" aria-labelledby="how-it-works-title">
      <div className="mx-auto max-w-6xl">
        <h2 id="how-it-works-title" className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">{t("subtitle")}</p>
        <ol className="mt-12 flex flex-col gap-0 sm:gap-2">
          {HOW_IT_WORKS_KEYS.map((key, index) => (
            <li key={key} className="flex flex-col items-center sm:flex-row sm:items-stretch">
              <article className="flex w-full max-w-md flex-1 items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm sm:max-w-none">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-xl"
                  aria-hidden="true"
                >
                  {STEP_ICONS[key]}
                </div>
                <div>
                  <h3 className="font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-[var(--muted-fg)]">{t(`steps.${key}.desc`)}</p>
                </div>
              </article>
              {index < HOW_IT_WORKS_KEYS.length - 1 && (
                <div
                  className="flex h-8 items-center justify-center text-[var(--muted-fg)] sm:h-auto sm:w-10 sm:flex-col"
                  aria-hidden="true"
                >
                  <span className="text-lg sm:rotate-90">↓</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
