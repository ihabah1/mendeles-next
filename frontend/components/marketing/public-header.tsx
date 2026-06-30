import { Link } from "@/lib/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { MAIN_NAV } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

const btn =
  "inline-flex h-9 items-center justify-center rounded-[var(--radius)] px-3 text-sm font-medium transition";
const btnGhost = cn(btn, "hover:bg-[var(--muted)]");
const btnPrimary = cn(btn, "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90");
const btnOutline = cn(btn, "border border-[var(--border)] hover:bg-[var(--muted)]");

export async function PublicHeader() {
  const t = await getTranslations("auth");
  const tNav = await getTranslations("nav");
  const tl = await getTranslations("landing");
  const ta = await getTranslations("a11y");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[var(--background)]/85 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mendeles
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-[var(--muted-fg)] lg:flex" aria-label={ta("mainNav")}>
          {MAIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-[var(--foreground)]">
              {tl(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
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
