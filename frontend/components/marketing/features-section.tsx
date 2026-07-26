import { getTranslations } from "next-intl/server";

const FEATURE_KEYS = ["seo", "content", "landing", "crm", "analytics"] as const;

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  seo: "🔎",
  content: "✨",
  landing: "🧩",
  crm: "🎯",
  analytics: "📈",
};

export async function FeaturesSection() {
  const t = await getTranslations("landing.growthFeatures");

  return (
    <section id="how-it-works" className="relative px-6 py-20" aria-labelledby="features-title">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(109,40,217,0.12)_0%,_transparent_55%)]" />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("titlePrefix")}{" "}
            <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>{" "}
            {t("titleSuffix")}
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">{t("subtitle")}</p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURE_KEYS.map((key) => (
            <li
              key={key}
              className="rounded-2xl border border-white/10 bg-[#0f1528]/70 p-5 shadow-[0_0_40px_rgba(88,28,135,0.12)] backdrop-blur-sm transition hover:border-violet-400/35 hover:shadow-[0_0_50px_rgba(139,92,246,0.18)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/15 text-lg">
                <span aria-hidden="true">{FEATURE_ICONS[key]}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{t(`items.${key}.desc`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
