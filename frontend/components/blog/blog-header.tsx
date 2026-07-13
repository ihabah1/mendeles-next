import { Link } from "@/lib/i18n/navigation";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";
import { defaultNavCategories, localizeBlogCategories } from "@/lib/blog/category-labels";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { blogHref } from "@/lib/blog/utils";
import type { BlogCategory } from "@/lib/blog/types";

type Props = {
  categories: BlogCategory[];
  locale?: string;
};

export function BlogHeader({ categories, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const navCategories = localizeBlogCategories(
    categories.length > 0 ? categories.slice(0, 5) : defaultNavCategories(locale),
    locale,
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <MendelesInsightsLogo className="shrink-0" />
          <nav className="flex items-center gap-2 text-sm font-semibold sm:gap-3" aria-label={copy.siteNavLabel}>
            <Link
              href="/"
              className="rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-[#6F42F5]"
            >
              {copy.home}
            </Link>
            <Link
              href="/blog"
              className="rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-[#6F42F5]"
            >
              {copy.blog}
            </Link>
          </nav>
        </div>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 text-sm font-semibold text-slate-600 xl:flex"
          aria-label={copy.navLabel}
        >
          {navCategories.map((item) => (
            <Link key={item.slug} href={blogHref({ category: item.slug })} className="whitespace-nowrap transition hover:text-[#6F42F5]">
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          <Link
            href="/blog#newsletter"
            className="hidden rounded-xl bg-[#6F42F5] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(111,66,245,0.28)] transition hover:bg-[#5a32d4] md:inline-flex"
          >
            {copy.newsletter}
          </Link>
          <MarketingLocaleSwitcher className="rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#6F42F5]/30 hover:text-[#6F42F5]" />
        </div>
      </div>
    </header>
  );
}
