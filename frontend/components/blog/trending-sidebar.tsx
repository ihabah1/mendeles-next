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
    <section className={`rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ${locale === "en" ? "text-left" : "text-right"}`}>
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
                  ? "bg-[#6F42F5]/10 font-semibold text-[#6F42F5]"
                  : "text-slate-600 hover:bg-pink-50 hover:text-[#6F42F5]"
              }`}
            >
              <span className="rounded-md bg-pink-50 px-2 py-0.5 text-xs font-medium text-slate-500">{item.count}</span>
              <span>{item.name}</span>
            </Link>
          ))
        )}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-500">{copy.categoriesLabel}</h3>
        <div className={`mt-3 flex flex-wrap gap-2 ${locale === "en" ? "justify-start" : "justify-end"}`}>
          {categories.map((item) => (
            <Link
              key={item.slug}
              href={blogHref({ category: item.slug })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === item.slug
                  ? "bg-[#6F42F5] text-white"
                  : "border border-slate-200 bg-pink-50/80 text-slate-600 hover:border-[#6F42F5]/30"
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
