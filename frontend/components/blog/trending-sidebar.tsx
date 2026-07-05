import { Link } from "@/lib/i18n/navigation";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCategory } from "@/lib/blog/types";
import { blogHref } from "@/lib/blog/utils";

type Props = {
  categories: BlogCategory[];
  activeCategory?: string;
  locale?: string;
};

export function TrendingSidebar({ categories, activeCategory = "", locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const trending = [...categories].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${locale === "en" ? "text-left" : "text-right"}`}>
      <h2 className="text-lg font-bold text-slate-900">{copy.trendingTopics}</h2>
      <div className="mt-5 space-y-1">
        {trending.length === 0 ? (
          <p className="text-sm text-slate-500">{copy.noCategories}</p>
        ) : (
          trending.map((item) => (
            <Link
              key={item.slug}
              href={blogHref({ category: item.slug })}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                activeCategory === item.slug
                  ? "bg-red-50 font-semibold text-red-700"
                  : "text-slate-600 hover:bg-[#F7F8FC] hover:text-slate-900"
              }`}
            >
              <span className="rounded-md bg-[#F7F8FC] px-2 py-0.5 text-xs font-medium text-slate-500">{item.count}</span>
              <span>{item.name}</span>
            </Link>
          ))
        )}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{copy.categoriesLabel}</h3>
        <div className={`mt-3 flex flex-wrap gap-2 ${locale === "en" ? "justify-start" : "justify-end"}`}>
          {categories.map((item) => (
            <Link
              key={item.slug}
              href={blogHref({ category: item.slug })}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeCategory === item.slug
                  ? item.slug === "sports"
                    ? "bg-red-600 text-white"
                    : "bg-slate-900 text-white"
                  : "border border-slate-200 bg-[#F7F8FC] text-slate-600 hover:border-slate-900/30"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
