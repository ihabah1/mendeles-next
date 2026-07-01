"use client";

import { useTranslations } from "next-intl";

export function SkipToContent() {
  const t = useTranslations("a11y");

  return (
    <a
      href="#main-content"
      className="fixed start-4 top-4 z-[200] -translate-y-20 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white"
    >
      {t("skipToContent")}
    </a>
  );
}
