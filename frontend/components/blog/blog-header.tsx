import { Link } from "@/lib/i18n/navigation";
import { MarketingLocaleSwitcher } from "@/components/marketing/marketing-locale-switcher";
import { MendelesInsightsLogo } from "@/components/blog/mendeles-insights-logo";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCategory } from "@/lib/blog/types";

function fallbackNav(locale: string): BlogCategory[] {
  if (locale === "en") {
    return [
      { slug: "seo", name: "SEO", count: 0 },
      { slug: "digital-marketing", name: "Digital Marketing", count: 0 },
      { slug: "ai-automation", name: "AI", count: 0 },
      { slug: "sports", name: "Sports", count: 0 },
      { slug: "news", name: "News", count: 0 },
    ];
  }
  return [
    { slug: "seo", name: "SEO", count: 0 },
    { slug: "digital-marketing", name: "שיווק דיגיטלי", count: 0 },
    { slug: "ai-automation", name: "AI", count: 0 },
    { slug: "sports", name: "ספורט", count: 0 },
    { slug: "news", name: "אקטואליה", count: 0 },
  ];
}

type Props = {
  categories: BlogCategory[];
  locale?: string;
};

export function BlogHeader({ categories, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const navCategories = categories.length > 0 ? categories : fallbackNav(locale);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-red-600 bg-slate-950 text-white shadow-lg">
      <div className="border-b border-white/10 bg-red-600/90 px-4 py-1 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-white">
        {copy.breaking} · Mendeles Insights
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="#blog-search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-slate-300 transition hover:border-red-400 hover:text-white"
            aria-label={copy.search}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <MarketingLocaleSwitcher className="rounded-xl border border-white/15 text-slate-300 hover:border-red-400 hover:bg-white/5 hover:text-white" />
          <Link
            href="/blog#newsletter"
            className="hidden rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-500 md:inline-flex"
          >
            {copy.newsletter}
          </Link>
        </div>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 xl:flex" aria-label={copy.navLabel}>
          {navCategories.slice(0, 6).map((item) => (
            <Link
              key={item.slug}
              href={`/blog?category=${item.slug}`}
              className={`transition hover:text-white ${item.slug === "sports" ? "text-red-300 hover:text-red-200" : ""}`}
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
