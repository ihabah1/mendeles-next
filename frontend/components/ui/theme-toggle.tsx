"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <button
      type="button"
      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={t("toggle")}
    >
      {theme === "dark" ? t("light") : t("dark")}
    </button>
  );
}
