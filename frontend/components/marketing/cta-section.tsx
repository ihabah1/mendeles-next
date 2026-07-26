import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function CtaSection() {
  const tl = await getTranslations("landing");

  return (
    <section className="px-6 py-20" aria-labelledby="cta-title">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-[#0f1528] to-violet-950/80 px-8 py-12 sm:px-12">
        <div className="max-w-xl">
          <h2 id="cta-title" className="text-2xl font-bold text-white sm:text-3xl">
            {tl("ctaTitle")}
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">{tl("ctaSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95"
            >
              {tl("ctaPrimary")}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-11 items-center rounded-xl border border-white/15 px-6 text-sm font-medium text-white hover:bg-white/5"
            >
              {tl("ctaSecondary")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function FooterSection() {
  const tl = await getTranslations("landing.footer");
  const landing = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <footer className="border-t border-white/10">
      <div className="border-b border-white/5 bg-[#070a12] px-6 py-4">
        <p className="mx-auto max-w-7xl text-center text-sm font-medium tracking-wide text-slate-200 sm:text-start">
          {landing("blogHint")}
        </p>
      </div>
      <div className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="font-bold text-white">{tc("appName")}</div>
              <p className="mt-2 text-sm text-slate-400">{tc("tagline")}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{tl("product")}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/solutions" className="hover:text-white">
                    {tl("solutions")}
                  </Link>
                </li>
                <li>
                  <Link href="/industries" className="hover:text-white">
                    {tl("industries")}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="font-semibold text-cyan-300 hover:text-white">
                    {tl("blog")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{tl("company")}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/company" className="hover:text-white">
                    {tl("about")}
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white">
                    {tl("getStarted")}
                  </Link>
                </li>
                <li>
                  <Link href="/accessibility" className="hover:text-white">
                    {tl("accessibility")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-xs text-slate-400">{tl("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
