import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function BlogPromoSection() {
  const t = await getTranslations("landing.blogBanner");

  return (
    <section className="px-6 py-16" aria-labelledby="blog-promo-title">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        <Link
          href="/blog"
          className="group relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,#04111f_0%,#0b2a3d_45%,#12324a_100%)] p-8 shadow-[0_20px_60px_rgba(8,47,73,0.45)] transition hover:border-cyan-300/50 hover:shadow-[0_24px_70px_rgba(34,211,238,0.2)] sm:p-10"
        >
          <div
            className="pointer-events-none absolute -end-10 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl transition group-hover:bg-cyan-300/30"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -start-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
            aria-hidden
          />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-300">
            {t("eyebrow")}
          </p>
          <h2 id="blog-promo-title" className="relative mt-3 max-w-md text-2xl font-black leading-tight text-white sm:text-3xl">
            {t("title")}
          </h2>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
            {t("subtitle")}
          </p>
          <span className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 transition group-hover:scale-[1.03]">
            {t("cta")}
            <span aria-hidden>→</span>
          </span>
        </Link>

        <Link
          href="/blog/tools"
          className="group relative overflow-hidden rounded-2xl border border-amber-300/25 bg-[linear-gradient(145deg,#1a1208_0%,#3a2410_50%,#4a2c12_100%)] p-8 shadow-[0_20px_60px_rgba(68,40,12,0.45)] transition hover:border-amber-200/45 hover:shadow-[0_24px_70px_rgba(251,191,36,0.18)] sm:p-10"
        >
          <div
            className="pointer-events-none absolute -end-8 top-0 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl transition group-hover:bg-amber-300/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent"
            aria-hidden
          />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">
            {t("toolsEyebrow")}
          </p>
          <h3 className="relative mt-3 max-w-md text-2xl font-black leading-tight text-white sm:text-3xl">
            {t("toolsTitle")}
          </h3>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-amber-50/75 sm:text-base">
            {t("toolsSubtitle")}
          </p>
          <span className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-amber-300/15 px-5 py-2.5 text-sm font-extrabold text-amber-50 backdrop-blur transition group-hover:bg-amber-300/25">
            {t("toolsCta")}
            <span aria-hidden>→</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
