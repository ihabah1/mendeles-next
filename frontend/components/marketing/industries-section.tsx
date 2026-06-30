import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { INDUSTRY_SLUGS } from "@/lib/marketing/content";

export async function IndustriesSection() {
  const t = await getTranslations("landing.industries");

  return (
    <section id="industries" className="border-t border-white/10 px-6 py-20" aria-labelledby="industries-title">
      <div className="mx-auto max-w-7xl">
        <h2 id="industries-title" className="text-3xl font-bold tracking-tight text-white">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-400">{t("subtitle")}</p>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {INDUSTRY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/industries/${slug}`}
                className="flex h-full items-center rounded-xl border border-white/10 bg-[#0f1528]/40 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-indigo-500/30 hover:bg-[#121a30]"
              >
                {t(`items.${slug}`)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link href="/industries" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">
            {t("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
