"use client";

import { Link } from "@/lib/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";
import { editorialCopy } from "@/lib/blog/editorial-copy";

export function BlogFooter() {
  const t = useTranslations("landing.footer");
  const locale = useLocale();
  const copy = editorialCopy(locale);

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
        <MendelesInsightsLogo showWordmark />
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/" className="font-semibold text-[#6F42F5] transition hover:underline">
            {copy.home}
          </Link>
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
