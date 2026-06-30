import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";
import { INDUSTRY_SLUGS } from "@/lib/marketing/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.industries");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function IndustriesHubPage() {
  const t = await getTranslations("hub.industries");
  const ti = await getTranslations("landing.industries");

  const links = INDUSTRY_SLUGS.map((slug) => ({
    href: `/industries/${slug}`,
    label: ti(`items.${slug}`),
    description: ti(`descriptions.${slug}`),
  }));

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")} links={links} />
    </MarketingShell>
  );
}
