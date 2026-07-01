import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageSchemas } from "@/components/seo/page-schemas";
import { HubPageContent } from "@/components/marketing/hub-page-content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { staticPageBreadcrumbs } from "@/lib/seo/breadcrumbs";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("hub.company");
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/company",
    locale,
  });
}

export default async function CompanyPage() {
  const t = await getTranslations("hub.company");
  const th = await getTranslations("common");
  const breadcrumbs = staticPageBreadcrumbs(th("appName"), [{ name: t("title"), path: "/company" }]);

  return (
    <MarketingShell>
      <PageSchemas breadcrumbs={breadcrumbs} />
      <HubPageContent title={t("title")} subtitle={t("subtitle")}>
        <div className="mt-10 max-w-3xl space-y-6 leading-relaxed text-slate-400">
          <p>{t("mission")}</p>
          <p>{t("vision")}</p>
        </div>
        <Link
          href="/register"
          className="mt-10 inline-flex h-11 items-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 text-sm font-semibold text-white hover:opacity-95"
        >
          {t("cta")}
        </Link>
      </HubPageContent>
    </MarketingShell>
  );
}
