import { Link } from "@/lib/i18n/navigation";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCategory } from "@/lib/blog/types";
import { blogHref } from "@/lib/blog/utils";

type Props = {
  categories: BlogCategory[];
  activeCategory?: string;
  query?: string;
  sort?: string;
  locale?: string;
};

export function CategoryFilter({
  categories,
  activeCategory = "",
  query = "",
  sort = "newest",
  locale = "he",
}: Props) {
  const copy = editorialCopy(locale);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${locale === "en" ? "justify-start" : "justify-end"}`}>
      <Link
        href={blogHref({ q: query, sort })}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          !activeCategory
            ? "bg-slate-900 text-white shadow-sm"
            : "border border-slate-200 bg-white text-slate-600 hover:border-slate-900/30 hover:text-slate-900"
        }`}
      >
        {copy.filterAll}
      </Link>
      {categories.map((item) => (
        <Link
          key={item.slug}
          href={blogHref({ category: item.slug, q: query, sort })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeCategory === item.slug
              ? item.slug === "sports"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-slate-900 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-slate-900/30 hover:text-slate-900"
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
