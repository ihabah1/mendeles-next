import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageSchemas } from "@/components/seo/page-schemas";
import { HubPageContent } from "@/components/marketing/hub-page-content";
import { SOLUTION_SLUGS } from "@/lib/marketing/content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { staticPageBreadcrumbs } from "@/lib/seo/breadcrumbs";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("hub.solutions");
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/solutions",
    locale,
  });
}

export default async function SolutionsHubPage() {
  const t = await getTranslations("hub.solutions");
  const ts = await getTranslations("landing.solutions");
  const th = await getTranslations("common");
  const breadcrumbs = staticPageBreadcrumbs(th("appName"), [{ name: t("title"), path: "/solutions" }]);

  const links = SOLUTION_SLUGS.map((slug) => ({
    href: `/solutions/${slug}`,
    label: ts(`items.${slug}.title`),
    description: ts(`items.${slug}.desc`),
  }));

  return (
    <MarketingShell>
      <PageSchemas breadcrumbs={breadcrumbs} />
      <HubPageContent title={t("title")} subtitle={t("subtitle")} links={links} />
    </MarketingShell>
  );
}
