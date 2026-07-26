import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { HeroPlatformVisual } from "@/components/marketing/hero-platform-visual";
import { cn } from "@/lib/utils";

const TRUST_KEYS = ["noCard", "fastSetup", "cancel"] as const;
const TRUST_ICONS = { noCard: "✓", fastSetup: "⚡", cancel: "🛡" };

const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-full bg-[#7c3aed] px-7 text-sm font-semibold text-white shadow-[0_0_32px_rgba(124,58,237,0.55)] transition hover:bg-[#6d28d9]";

export async function HeroSection() {
  const tl = await getTranslations("landing");

  return (
    <section
      className="relative overflow-hidden px-6 pb-14 pt-10 lg:pb-20 lg:pt-14"
      aria-labelledby="hero-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.22)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
            <span aria-hidden="true">✨</span>
            {tl("badge")}
          </div>

          <h1
            id="hero-title"
            className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]"
          >
            {tl("heroTitleLine1")}{" "}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              {tl("heroTitleHighlight")}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">{tl("heroSubtitle")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={btnPrimary}>
              {tl("ctaPrimary")}
              <span className="ms-2" aria-hidden="true">
                →
              </span>
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10",
              )}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-[10px]"
                aria-hidden="true"
              >
                ▶
              </span>
              {tl("ctaSecondary")}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
            {TRUST_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <span className="text-violet-300" aria-hidden="true">
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
