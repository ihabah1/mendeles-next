import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export async function HeroSection() {
  const tl = await getTranslations("landing");

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16" aria-labelledby="hero-title">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--accent-muted)_0%,_transparent_55%)]" />
      <div className="mx-auto max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs text-[var(--muted-fg)]">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />
          {tl("badge")}
        </div>
        <h1 id="hero-title" className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {tl("heroTitle")}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-[var(--muted-fg)] sm:text-xl">{tl("heroSubtitle")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className={cn(
              "inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] shadow-sm transition hover:opacity-90",
            )}
          >
            {tl("ctaPrimary")}
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-6 text-sm font-medium hover:bg-[var(--muted)]"
          >
            {tl("ctaSecondary")}
          </a>
        </div>
        <dl id="stats" className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { label: tl("statLeads"), value: tl("statLeadsValue") },
            { label: tl("statTraffic"), value: tl("statTrafficValue") },
            { label: tl("statConversion"), value: tl("statConversionValue") },
            { label: tl("statGrowth"), value: tl("statGrowthValue") },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4">
              <dt className="text-xs text-[var(--muted-fg)]">{item.label}</dt>
              <dd className="mt-1 text-2xl font-bold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
