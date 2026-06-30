import { Link } from "@/lib/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
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

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mendeles
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--muted-fg)] md:flex" aria-label="Main">
          <a href="#features" className="hover:text-[var(--foreground)]">
            {tl("navFeatures")}
          </a>
          <a href="#stats" className="hover:text-[var(--foreground)]">
            {tl("navStats")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link href="/login" className={cn(btnGhost, "hidden sm:inline-flex")}>
            {t("login")}
          </Link>
          <Link href="/register" className={btnPrimary}>
            {t("register")}
          </Link>
          <Link href="/dashboard" className={cn(btnOutline, "hidden lg:inline-flex")}>
            {tNav("dashboard")}
          </Link>
        </div>
      </div>
    </header>
  );
}
