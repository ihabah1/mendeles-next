import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { DetailPageContent } from "@/components/marketing/hub-page-content";
import { SOLUTION_SLUGS, type SolutionSlug } from "@/lib/marketing/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SOLUTION_SLUGS.includes(slug as SolutionSlug)) return {};
  const t = await getTranslations(`hub.solutions.pages.${slug}`);
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  if (!SOLUTION_SLUGS.includes(slug as SolutionSlug)) notFound();

  const t = await getTranslations(`hub.solutions.pages.${slug}`);
  const th = await getTranslations("hub.solutions");

  return (
    <MarketingShell>
      <DetailPageContent
        title={t("title")}
        subtitle={t("subtitle")}
        body={t("body")}
        backHref="/solutions"
        backLabel={th("back")}
        ctaLabel={th("cta")}
      />
    </MarketingShell>
  );
}
