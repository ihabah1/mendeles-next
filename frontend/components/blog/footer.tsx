"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";

export function BlogFooter() {
  const t = useTranslations("marketing.footer");

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
        <MendelesInsightsLogo showWordmark />
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/company" className="transition hover:text-[#6F42F5]">
            {t("about")}
          </Link>
          <Link href="/blog" className="transition hover:text-[#6F42F5]">
            {t("blog")}
          </Link>
          <Link href="/accessibility" className="transition hover:text-[#6F42F5]">
            {t("accessibility")}
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Mendeles Insights</p>
      </div>
    </footer>
  );
}
