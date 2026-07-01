import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccessibilityCoordinatorSection } from "@/components/a11y/accessibility-coordinator";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "a11y.page" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/accessibility",
  });
}

export default async function AccessibilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("a11y.page");

  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-4 text-slate-300">{t("intro")}</p>

        <section className="mt-10 space-y-4" aria-labelledby="a11y-features">
          <h2 id="a11y-features" className="text-xl font-semibold text-white">
            {t("featuresTitle")}
          </h2>
          <ul className="list-disc space-y-2 ps-6 text-slate-300">
            <li>{t("featureFont")}</li>
            <li>{t("featureContrast")}</li>
            <li>{t("featureLinks")}</li>
            <li>{t("featureMotion")}</li>
            <li>{t("featureKeyboard")}</li>
            <li>{t("featureWidget")}</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4" aria-labelledby="a11y-standard">
          <h2 id="a11y-standard" className="text-xl font-semibold text-white">
            {t("standardTitle")}
          </h2>
          <p className="text-slate-300">{t("standardBody")}</p>
        </section>

        <AccessibilityCoordinatorSection />
      </article>
    </MarketingShell>
  );
}
