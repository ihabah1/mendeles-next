import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageSchemas } from "@/components/seo/page-schemas";
import { HeroSection } from "@/components/marketing/hero-section";
import { PromoVideosSection } from "@/components/marketing/promo-videos-section";
import { BlogPromoSection } from "@/components/marketing/blog-promo-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale,
  });
}

export default function LandingPage() {
  return (
    <MarketingShell>
      <PageSchemas />
      <HeroSection />
      <PromoVideosSection />
      <BlogPromoSection />
      <TrustSection />
      <CtaSection />
    </MarketingShell>
  );
}
