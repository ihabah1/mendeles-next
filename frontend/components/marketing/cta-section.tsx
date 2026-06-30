import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function CtaSection() {
  const tl = await getTranslations("landing");

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--primary)] px-8 py-12 text-[var(--primary-fg)] sm:px-12">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold sm:text-3xl">{tl("ctaTitle")}</h2>
          <p className="mt-3 text-sm opacity-80 sm:text-base">{tl("ctaSubtitle")}</p>
          <Link
            href="/register"
            className="mt-6 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
          >
            {tl("ctaPrimary")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function FooterSection() {
  const tl = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <footer className="border-t border-[var(--border)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold">{tc("appName")}</div>
          <p className="text-sm text-[var(--muted-fg)]">{tc("tagline")}</p>
        </div>
        <p className="text-xs text-[var(--muted-fg)]">{tl("footerNote")}</p>
      </div>
    </footer>
  );
}
