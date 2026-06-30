import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function CtaSection() {
  const tl = await getTranslations("landing");

  return (
    <section className="px-6 py-20" aria-labelledby="cta-title">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--primary)] px-8 py-12 text-[var(--primary-fg)] sm:px-12">
        <div className="max-w-xl">
          <h2 id="cta-title" className="text-2xl font-bold sm:text-3xl">
            {tl("ctaTitle")}
          </h2>
          <p className="mt-3 text-sm opacity-80 sm:text-base">{tl("ctaSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
            >
              {tl("ctaPrimary")}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--primary-fg)]/30 px-6 text-sm font-medium hover:bg-[var(--primary-fg)]/10"
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
  const tc = await getTranslations("common");

  return (
    <footer className="border-t border-[var(--border)] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="font-bold">{tc("appName")}</div>
            <p className="mt-2 text-sm text-[var(--muted-fg)]">{tc("tagline")}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{tl("product")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-fg)]">
              <li>
                <Link href="/solutions" className="hover:text-[var(--foreground)]">
                  {tl("solutions")}
                </Link>
              </li>
              <li>
                <Link href="/industries" className="hover:text-[var(--foreground)]">
                  {tl("industries")}
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-[var(--foreground)]">
                  {tl("templates")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[var(--foreground)]">
                  {tl("pricing")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{tl("resources")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-fg)]">
              <li>
                <Link href="/blog" className="hover:text-[var(--foreground)]">
                  {tl("blog")}
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-[var(--foreground)]">
                  {tl("guides")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{tl("company")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-fg)]">
              <li>
                <Link href="/company" className="hover:text-[var(--foreground)]">
                  {tl("about")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[var(--foreground)]">
                  {tl("getStarted")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-[var(--muted-fg)]">{tl("copyright")}</p>
      </div>
    </footer>
  );
}
