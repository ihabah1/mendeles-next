import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { HeroSection } from "@/components/marketing/hero-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { CtaSection } from "@/components/marketing/cta-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default function LandingPage() {
  return (
    <MarketingShell>
      <HeroSection />
      <TrustSection />
      <CtaSection />
    </MarketingShell>
  );
}
