import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.templates");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function TemplatesPage() {
  const t = await getTranslations("hub.templates");

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")}>
        <p className="mt-8 rounded-xl border border-white/10 bg-[#0f1528]/60 p-6 text-sm text-slate-400">
          {t("comingSoon")}
        </p>
      </HubPageContent>
    </MarketingShell>
  );
}
