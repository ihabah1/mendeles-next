import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.company");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function CompanyPage() {
  const t = await getTranslations("hub.company");

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")}>
        <div className="mt-10 max-w-3xl space-y-6 leading-relaxed text-[var(--muted-fg)]">
          <p>{t("mission")}</p>
          <p>{t("vision")}</p>
        </div>
        <Link
          href="/register"
          className="mt-10 inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
        >
          {t("cta")}
        </Link>
      </HubPageContent>
    </MarketingShell>
  );
}
