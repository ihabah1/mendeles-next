import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HubPageContent } from "@/components/marketing/hub-page-content";

const PLANS = ["starter", "growth", "agency"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.pricing");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PricingPage() {
  const t = await getTranslations("hub.pricing");

  return (
    <MarketingShell>
      <HubPageContent title={t("title")} subtitle={t("subtitle")}>
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <li
              key={plan}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold">{t(`plans.${plan}.name`)}</h2>
              <p className="mt-2 text-3xl font-bold">{t(`plans.${plan}.price`)}</p>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{t(`plans.${plan}.desc`)}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--muted-fg)]">
                {[1, 2, 3].map((n) => (
                  <li key={n}>• {t(`plans.${plan}.f${n}`)}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)] hover:opacity-90"
              >
                {t("cta")}
              </Link>
            </li>
          ))}
        </ul>
      </HubPageContent>
    </MarketingShell>
  );
}
