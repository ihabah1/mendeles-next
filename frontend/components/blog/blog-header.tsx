import { Link } from "@/lib/i18n/navigation";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";
import type { BlogCategory } from "@/lib/blog/types";

const FALLBACK_NAV: BlogCategory[] = [
  { slug: "seo", name: "SEO", count: 0 },
  { slug: "digital-marketing", name: "שיווק דיגיטלי", count: 0 },
  { slug: "ai-automation", name: "AI", count: 0 },
  { slug: "finance", name: "פיננסים", count: 0 },
  { slug: "business", name: "עסקים", count: 0 },
];

type Props = {
  categories: BlogCategory[];
};

export function BlogHeader({ categories }: Props) {
  const navCategories = categories.length > 0 ? categories : FALLBACK_NAV;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="#blog-search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#6F42F5]/30 hover:text-[#6F42F5]"
            aria-label="חיפוש"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <MarketingLocaleSwitcher className="rounded-xl border border-slate-200 text-slate-600 hover:border-[#6F42F5]/30 hover:bg-[#F7F8FC] hover:text-[#6F42F5]" />
          <Link
            href="/blog#newsletter"
            className="hidden rounded-xl bg-[#6F42F5] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(111,66,245,0.28)] transition hover:bg-[#5a32d4] md:inline-flex"
          >
            הרשמה לניוזלטר
          </Link>
        </div>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 xl:flex" aria-label="קטגוריות בלוג">
          {navCategories.slice(0, 6).map((item) => (
            <Link
              key={item.slug}
              href={`/blog?category=${item.slug}`}
              className="transition hover:text-[#6F42F5]"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <MendelesInsightsLogo />
      </div>
    </header>
  );
}
