import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { SOLUTION_SLUGS } from "@/lib/marketing/content";

const ICONS = ["🎯", "🔎", "⚡", "🤖", "📊", "📈"];

export async function SolutionsSection() {
  const t = await getTranslations("landing.solutions");

  return (
    <section id="solutions" className="border-t border-[var(--border)] bg-[var(--muted)]/40 px-6 py-20" aria-labelledby="solutions-title">
      <div className="mx-auto max-w-6xl">
        <h2 id="solutions-title" className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">{t("subtitle")}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTION_SLUGS.map((slug, i) => (
            <article
              key={slug}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm transition hover:border-[var(--accent)]/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-lg" aria-hidden="true">
                {ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold">{t(`items.${slug}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-fg)]">{t(`items.${slug}.desc`)}</p>
              <Link
                href={`/solutions/${slug}`}
                className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
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
