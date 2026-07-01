import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageSchemas } from "@/components/seo/page-schemas";
import { DetailPageContent } from "@/components/marketing/hub-page-content";
import { INDUSTRY_SLUGS, type IndustrySlug } from "@/lib/marketing/content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { staticPageBreadcrumbs } from "@/lib/seo/breadcrumbs";

type Props = { params: Promise<{ slug: string; locale: string }> };

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  if (!INDUSTRY_SLUGS.includes(slug as IndustrySlug)) return {};
  const t = await getTranslations(`hub.industries.pages.${slug}`);
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: `/industries/${slug}`,
    locale,
  });
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  if (!INDUSTRY_SLUGS.includes(slug as IndustrySlug)) notFound();

  const t = await getTranslations(`hub.industries.pages.${slug}`);
  const th = await getTranslations("hub.industries");
  const tc = await getTranslations("common");
  const breadcrumbs = staticPageBreadcrumbs(tc("appName"), [
    { name: th("title"), path: "/industries" },
    { name: t("title"), path: `/industries/${slug}` },
  ]);

  return (
    <MarketingShell>
      <PageSchemas breadcrumbs={breadcrumbs} />
      <DetailPageContent
        title={t("title")}
        subtitle={t("subtitle")}
        body={t("body")}
        backHref="/industries"
        backLabel={th("back")}
        ctaLabel={th("cta")}
      />
    </MarketingShell>
  );
}
