import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.blog");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function BlogPage() {
  const t = await getTranslations("hub.blog");

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")}>
        <p className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-6 text-sm text-[var(--muted-fg)]">
          {t("comingSoon")}
        </p>
      </HubPageContent>
    </MarketingShell>
  );
}
