import { getTranslations } from "next-intl/server";

const FEATURE_KEYS = ["keyword", "content", "seo", "leads", "analytics", "ai"] as const;

const ICON_STYLES: Record<(typeof FEATURE_KEYS)[number], string> = {
  keyword: "bg-violet-500/15 text-violet-300",
  content: "bg-emerald-500/15 text-emerald-300",
  seo: "bg-blue-500/15 text-blue-300",
  leads: "bg-orange-500/15 text-orange-300",
  analytics: "bg-purple-500/15 text-purple-300",
  ai: "bg-teal-500/15 text-teal-300",
};

const ICONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  keyword: "🔍",
  content: "✨",
  seo: "🌐",
  leads: "📈",
  analytics: "📊",
  ai: "🤖",
};

export async function GrowthFeaturesSection() {
  const t = await getTranslations("landing.growthFeatures");

  return (
    <section id="features" className="px-6 py-20" aria-labelledby="growth-features-title">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 id="growth-features-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {FEATURE_KEYS.map((key) => (
            <article
              key={key}
              className="rounded-xl border border-white/10 bg-[#0f1528]/60 p-5 transition hover:border-indigo-500/30 hover:bg-[#121a30]/80"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${ICON_STYLES[key]}`}
                aria-hidden="true"
              >
                {ICONS[key]}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{t(`items.${key}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
