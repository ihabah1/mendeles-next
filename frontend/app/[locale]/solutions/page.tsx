import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";
import { SOLUTION_SLUGS } from "@/lib/marketing/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.solutions");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function SolutionsHubPage() {
  const t = await getTranslations("hub.solutions");
  const ts = await getTranslations("landing.solutions");

  const links = SOLUTION_SLUGS.map((slug) => ({
    href: `/solutions/${slug}`,
    label: ts(`items.${slug}.title`),
    description: ts(`items.${slug}.desc`),
  }));

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")} links={links} />
    </MarketingShell>
  );
}
