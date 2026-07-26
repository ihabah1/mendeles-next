import { getTranslations } from "next-intl/server";
import { PROMO_VIDEOS } from "@/lib/marketing/promo-videos";

export async function LogosTrustSection() {
  const t = await getTranslations("landing.promoVideos");

  return (
    <section
      className="border-y border-white/5 px-6 py-14"
      aria-labelledby="promo-videos-strip-title"
    >
      <div className="mx-auto max-w-7xl">
        <h2
          id="promo-videos-strip-title"
          className="text-center text-sm font-medium tracking-wide text-slate-400"
        >
          {t("title")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-xs text-slate-500 sm:text-sm">{t("subtitle")}</p>

        <ul className="mt-8 grid gap-5 sm:grid-cols-3">
          {PROMO_VIDEOS.map((video) => {
            const titleId = `promo-strip-title-${video.id}`;
            const descId = `promo-strip-desc-${video.id}`;
            return (
              <li
                key={video.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1528]/70 shadow-[0_0_40px_rgba(88,28,135,0.12)]"
              >
                <div className="aspect-video bg-black">
                  <video
                    className="h-full w-full object-cover"
                    src={video.src}
                    controls
                    playsInline
                    preload="metadata"
                    muted
                    loop
                    autoPlay
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                  />
                </div>
                <div className="px-4 py-3">
                  <h3 id={titleId} className="text-sm font-semibold text-white">
                    {t(`items.${video.labelKey}.title`)}
                  </h3>
                  <p id={descId} className="mt-1 text-xs leading-relaxed text-slate-400">
                    {t(`items.${video.labelKey}.desc`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
