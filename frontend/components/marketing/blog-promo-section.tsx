import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function BlogPromoSection() {
  const t = await getTranslations("landing.blogBanner");

  return (
    <section className="px-6 py-10" aria-labelledby="blog-promo-title">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-400/40 bg-[linear-gradient(105deg,#1a0b2e_0%,#2a1450_40%,#151a35_100%)] px-6 py-8 shadow-[0_0_80px_rgba(139,92,246,0.28)] sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -start-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
          aria-hidden
        />

        <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          <div className="relative mx-auto h-36 w-36 sm:h-44 sm:w-44">
            <Image
              src="/marketing/mascots/squirrel.png"
              alt=""
              fill
              className="object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.45)]"
              sizes="176px"
            />
          </div>

          <div className="text-center lg:text-start">
            <h2 id="blog-promo-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {t("livePrefix") ? <>{t("livePrefix")} </> : null}
              <span className="text-violet-300">{t("liveBrand")}</span>
              {t("liveSuffix") ? <> {t("liveSuffix")}</> : null}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{t("subtitle")}</p>
            <Link
              href="/blog"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-300/50 bg-violet-500/20 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500/35"
            >
              {t("cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="mx-auto max-w-[11rem] rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-xs font-semibold leading-snug text-violet-100 backdrop-blur-sm lg:mx-0">
            {t("freshNote")}
          </div>
        </div>
      </div>
    </section>
  );
}
