import { Link } from "@/lib/i18n/navigation";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCategory } from "@/lib/blog/types";

function fallbackNav(locale: string): BlogCategory[] {
  if (locale === "en") {
    return [
      { slug: "world_news", name: "World News", count: 0 },
      { slug: "sports", name: "Sports", count: 0 },
      { slug: "law", name: "Law", count: 0 },
      { slug: "economy", name: "Economy", count: 0 },
      { slug: "current_affairs", name: "Current Affairs", count: 0 },
      { slug: "automotive", name: "Automotive", count: 0 },
    ];
  }
  return [
    { slug: "world_news", name: "בעולם", count: 0 },
    { slug: "sports", name: "ספורט", count: 0 },
    { slug: "law", name: "עריכת דין", count: 0 },
    { slug: "economy", name: "כלכלה", count: 0 },
    { slug: "current_affairs", name: "אקטואליה", count: 0 },
    { slug: "automotive", name: "רכב", count: 0 },
  ];
}

type Props = {
  categories: BlogCategory[];
  locale?: string;
};

export function BlogHeader({ categories, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const navCategories = categories.length > 0 ? categories.slice(0, 6) : fallbackNav(locale);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <MendelesInsightsLogo className="relative z-10 shrink-0" />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-semibold text-slate-600 xl:flex"
          aria-label={copy.navLabel}
        >
          {navCategories.map((item) => (
            <Link key={item.slug} href={`/blog?category=${item.slug}`} className="whitespace-nowrap transition hover:text-[#6F42F5]">
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
          <Link
            href="#blog-search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#6F42F5]/30 hover:text-[#6F42F5]"
            aria-label={copy.search}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
