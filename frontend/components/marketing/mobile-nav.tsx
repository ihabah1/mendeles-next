"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { MAIN_NAV } from "@/lib/marketing/content";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tl = useTranslations("landing");

  return (
    <div className="xl:hidden">
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white hover:bg-white/5"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? tl("navClose") : tl("navMenu")}
      </button>
      {open && (
        <nav
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-white/10 bg-[#0a0e1a] px-6 py-4 shadow-2xl"
          aria-label={tl("navAria")}
        >
          <ul className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {tl(item.labelKey)}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-white/10 pt-2">
              <Link href="/login" className="block px-3 py-2.5 text-sm text-slate-300" onClick={() => setOpen(false)}>
                {tAuth("login")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="block px-3 py-2.5 text-sm text-slate-300" onClick={() => setOpen(false)}>
                {tNav("dashboard")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
