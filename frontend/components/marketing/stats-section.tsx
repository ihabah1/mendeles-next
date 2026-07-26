import Image from "next/image";
import { getTranslations } from "next-intl/server";

const STAT_KEYS = ["businesses", "leads", "pageviews", "satisfaction"] as const;

const STAT_ICONS: Record<(typeof STAT_KEYS)[number], string> = {
  businesses: "🚀",
  leads: "🎯",
  pageviews: "📊",
  satisfaction: "🏆",
};

export async function StatsSection() {
  const t = await getTranslations("landing.stats");

  return (
    <section className="px-6 pb-20" aria-labelledby="stats-title">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-400/25 bg-[linear-gradient(120deg,#12081f_0%,#1a1035_45%,#0d1528_100%)] px-6 py-10 shadow-[0_0_60px_rgba(109,40,217,0.25)] sm:px-10">
        <h2 id="stats-title" className="sr-only">
          {t("title")}
        </h2>
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_KEYS.map((key) => (
              <li key={key} className="text-center sm:text-start">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-lg sm:mx-0">
                  <span aria-hidden="true">{STAT_ICONS[key]}</span>
                </div>
                <p className="mt-3 text-2xl font-bold text-white sm:text-3xl">{t(`items.${key}.value`)}</p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">{t(`items.${key}.label`)}</p>
              </li>
            ))}
          </ul>
          <div className="relative mx-auto h-40 w-40 shrink-0 sm:h-48 sm:w-48">
            <Image
              src="/marketing/mascots/owl.png"
              alt=""
              fill
              className="object-contain drop-shadow-[0_20px_40px_rgba(109,40,217,0.45)]"
              sizes="192px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
