import type { ReactNode } from "react";
import { PublicHeader } from "@/components/marketing/public-header";
import { FooterSection } from "@/components/marketing/cta-section";

type Props = {
  children: ReactNode;
};

export function MarketingShell({ children }: Props) {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>{children}</main>
      <FooterSection />
    </div>
  );
}
