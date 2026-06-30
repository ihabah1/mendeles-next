import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { HeroPlatformVisual } from "@/components/marketing/hero-platform-visual";
import { cn } from "@/lib/utils";

const TRUST_KEYS = ["noCard", "fastSetup", "cancel"] as const;
const TRUST_ICONS = { noCard: "✓", fastSetup: "⚡", cancel: "🛡" };

const btnGradient =
  "inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95";

export async function HeroSection() {
  const tl = await getTranslations("landing");

  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-10 lg:pb-24 lg:pt-14" aria-labelledby="hero-title">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.2)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute end-0 top-0 -z-10 h-[600px] w-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
            <span aria-hidden="true">✨</span>
            {tl("badge")}
          </div>

          <h1 id="hero-title" className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
            {tl("heroTitleLine1")}{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
              {tl("heroTitleHighlight")}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">{tl("heroSubtitle")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={btnGradient}>
              {tl("ctaPrimary")}
              <span className="ms-2" aria-hidden="true">
                →
              </span>
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[10px]" aria-hidden="true">
                ▶
              </span>
              {tl("ctaSecondary")}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            {TRUST_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <span className="text-slate-400" aria-hidden="true">
                  {TRUST_ICONS[key]}
                </span>
                {tl(`trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <HeroPlatformVisual />
      </div>
    </section>
  );
}
