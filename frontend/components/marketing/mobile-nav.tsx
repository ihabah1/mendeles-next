"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { MAIN_NAV } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

const btn =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius)] px-3 text-sm font-medium transition";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tl = useTranslations("landing");

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className={cn(btn, "border border-[var(--border)] hover:bg-[var(--muted)]")}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? tl("navClose") : tl("navMenu")}
      </button>
      {open && (
        <nav
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--background)] px-6 py-4 shadow-lg"
          aria-label={tl("navAria")}
        >
          <ul className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-[var(--radius)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
                  onClick={() => setOpen(false)}
                >
                  {tl(item.labelKey)}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-[var(--border)] pt-2">
              <Link href="/login" className="block px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                {tAuth("login")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="block px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                {tNav("dashboard")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
