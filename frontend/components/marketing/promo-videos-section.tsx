import { getTranslations } from "next-intl/server";
import { PROMO_VIDEOS } from "@/lib/marketing/promo-videos";

export async function PromoVideosSection() {
  const t = await getTranslations("landing.promoVideos");

  return (
    <section
      id="how-it-works"
      className="border-t border-white/10 px-6 py-16 lg:py-24"
      aria-labelledby="promo-videos-title"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="promo-videos-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">{t("subtitle")}</p>
        </div>

        <ul className="mt-12 grid gap-8 lg:grid-cols-3">
          {PROMO_VIDEOS.map((video) => (
            <li
              key={video.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1528]/60 shadow-xl shadow-indigo-950/30"
            >
              <div className="aspect-video bg-black">
                <video
                  className="h-full w-full object-cover"
                  src={video.src}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={t(`items.${video.labelKey}.title`)}
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white">{t(`items.${video.labelKey}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`items.${video.labelKey}.desc`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
