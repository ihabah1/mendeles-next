import type { ReactNode } from "react";
import { PublicHeader } from "@/components/marketing/public-header";
import { FooterSection } from "@/components/marketing/cta-section";

type Props = {
  children: ReactNode;
};

export function MarketingShell({ children }: Props) {
  return (
    <div className="marketing min-h-screen bg-[#0a0e1a] text-slate-100">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
