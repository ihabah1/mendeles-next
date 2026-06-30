import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { INDUSTRY_SLUGS } from "@/lib/marketing/content";

export async function IndustriesSection() {
  const t = await getTranslations("landing.industries");

  return (
    <section id="industries" className="border-t border-[var(--border)] px-6 py-20" aria-labelledby="industries-title">
      <div className="mx-auto max-w-6xl">
        <h2 id="industries-title" className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">{t("subtitle")}</p>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/industries/${slug}`}
                className="flex h-full items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium transition hover:border-[var(--accent)]/40 hover:bg-[var(--muted)]/50"
              >
                {t(`items.${slug}`)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link href="/industries" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {t("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
