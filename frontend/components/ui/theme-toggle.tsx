"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="החלפת ערכת נושא"
    >
      {theme === "dark" ? "מצב בהיר" : "מצב כהה"}
    </button>
  );
}
