import { Link } from "@/lib/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { MAIN_NAV, FEATURED_NAV_CLASS } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

const DROPDOWN_NAV = new Set(["navSolutions"]);

const btnGhost =
  "inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium text-slate-300 transition hover:text-white";
const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.45)] transition hover:bg-[#6d28d9]";
const btnOutline =
  "inline-flex h-9 items-center justify-center rounded-full border border-white/25 bg-transparent px-4 text-sm font-medium text-white transition hover:bg-white/5";

export async function PublicHeader() {
  const t = await getTranslations("auth");
  const tNav = await getTranslations("nav");
  const tl = await getTranslations("landing");
  const ta = await getTranslations("a11y");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0e1a]/90 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <MarketingLogo />

        <nav className="hidden items-center gap-6 text-sm text-slate-400 xl:flex" aria-label={ta("mainNav")}>
          {MAIN_NAV.map((item) => (
            <span key={item.href} className="relative inline-flex flex-col items-center">
              {"featured" in item && item.featured ? (
                <span className="pointer-events-none absolute -top-5 whitespace-nowrap text-[10px] font-medium italic text-violet-300/90">
                  {tl("blogHint")}
                  <span className="ms-1" aria-hidden>
                    ↘
                  </span>
                </span>
              ) : null}
              <Link
                href={item.href}
                className={
                  "featured" in item && item.featured
                    ? FEATURED_NAV_CLASS
                    : "inline-flex items-center gap-0.5 whitespace-nowrap transition hover:text-white"
                }
              >
                {tl(item.labelKey)}
                {"featured" in item && item.featured ? (
                  <span className="text-[10px] opacity-90" aria-hidden="true">
                    +
                  </span>
                ) : (
                  DROPDOWN_NAV.has(item.labelKey) && (
                    <span className="text-[10px] opacity-60" aria-hidden="true">
                      ▾
                    </span>
                  )
                )}
              </Link>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <MarketingLocaleSwitcher />
          <Link href="/login" className={cn(btnGhost, "hidden sm:inline-flex")}>
            {t("login")}
          </Link>
          <Link href="/register" className={btnPrimary}>
            {t("register")}
          </Link>
          <Link href="/dashboard" className={cn(btnOutline, "hidden md:inline-flex")}>
            {tNav("dashboard")}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
