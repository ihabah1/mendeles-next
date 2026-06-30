import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { SOLUTION_SLUGS } from "@/lib/marketing/content";

const ICONS = ["🎯", "🔎", "⚡", "🤖", "📊", "📈"];

export async function SolutionsSection() {
  const t = await getTranslations("landing.solutions");

  return (
    <section id="solutions" className="border-t border-white/10 bg-[#080c16] px-6 py-20" aria-labelledby="solutions-title">
      <div className="mx-auto max-w-7xl">
        <h2 id="solutions-title" className="text-3xl font-bold tracking-tight text-white">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-400">{t("subtitle")}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTION_SLUGS.map((slug, i) => (
            <article
              key={slug}
              className="rounded-xl border border-white/10 bg-[#0f1528]/60 p-6 transition hover:border-indigo-500/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-lg" aria-hidden="true">
                {ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold text-white">{t(`items.${slug}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{t(`items.${slug}.desc`)}</p>
              <Link
                href={`/solutions/${slug}`}
                className="mt-4 inline-flex text-sm font-medium text-indigo-300 hover:text-indigo-200"
              >
                {t("learnMore")}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
