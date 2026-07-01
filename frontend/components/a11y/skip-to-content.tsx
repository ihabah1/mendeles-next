"use client";

import { useTranslations } from "next-intl";

export function SkipToContent() {
  const t = useTranslations("a11y");

  return (
    <a href="#main-content" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
