import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getDemoPage, landingPagePath } from "@/lib/landing/demo-pages";

const THEMES = {
  indigo: "from-indigo-600 to-violet-700",
  emerald: "from-emerald-600 to-teal-700",
  amber: "from-amber-500 to-orange-600",
} as const;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [
    { slug: "design-services" },
    { slug: "webinar-signup" },
    { slug: "summer-promo" },
  ];
}

export default async function SampleLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = getDemoPage(slug);
  if (!page) notFound();

  const t = await getTranslations("pages.demo");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-sm font-semibold">{tc("appName")}</span>
          <Link href="/" className="text-xs text-[var(--muted-fg)] hover:underline">
            {t("backHome")}
          </Link>
        </div>
      </header>

      <section className={`bg-gradient-to-br ${THEMES[page.theme]} px-6 py-20 text-white`}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-widest opacity-80">{t("sampleBadge")}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {t(`${page.nameKey}.headline`)}
          </h1>
          <p className="mt-4 text-lg opacity-90">{t(`${page.nameKey}.subtitle`)}</p>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold">{t("formTitle")}</h2>
          <form className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              placeholder={t("namePlaceholder")}
              readOnly
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              placeholder={t("emailPlaceholder")}
              readOnly
            />
            <button
              type="button"
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-[var(--primary-fg)]"
            >
              {t(`${page.nameKey}.cta`)}
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-[var(--muted-fg)]">{t("demoNote")}</p>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-center text-xs text-[var(--muted-fg)]">
        /p/{slug} · {landingPagePath(slug)}
      </footer>
    </div>
  );
}
