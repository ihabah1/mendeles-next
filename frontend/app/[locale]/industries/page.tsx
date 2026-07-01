import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageSchemas } from "@/components/seo/page-schemas";
import { HubPageContent } from "@/components/marketing/hub-page-content";
import { INDUSTRY_SLUGS } from "@/lib/marketing/content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { staticPageBreadcrumbs } from "@/lib/seo/breadcrumbs";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("hub.industries");
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/industries",
    locale,
  });
}

export default async function IndustriesHubPage() {
  const t = await getTranslations("hub.industries");
  const ti = await getTranslations("landing.industries");
  const th = await getTranslations("common");
  const breadcrumbs = staticPageBreadcrumbs(th("appName"), [{ name: t("title"), path: "/industries" }]);

  const links = INDUSTRY_SLUGS.map((slug) => ({
    href: `/industries/${slug}`,
    label: ti(`items.${slug}`),
    description: ti(`descriptions.${slug}`),
  }));

  return (
    <MarketingShell>
      <PageSchemas breadcrumbs={breadcrumbs} />
      <HubPageContent title={t("title")} subtitle={t("subtitle")} links={links} />
    </MarketingShell>
  );
}
