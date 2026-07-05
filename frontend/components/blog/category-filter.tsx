import { Link } from "@/lib/i18n/navigation";
import type { BlogCategory } from "@/lib/blog/types";
import { blogHref } from "@/lib/blog/utils";

type Props = {
  categories: BlogCategory[];
  activeCategory?: string;
  query?: string;
  sort?: string;
};

export function CategoryFilter({ categories, activeCategory = "", query = "", sort = "newest" }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={blogHref({ q: query, sort })}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          !activeCategory
            ? "bg-[#6F42F5] text-white shadow-sm"
            : "border border-slate-200 bg-white text-slate-600 hover:border-[#6F42F5]/30 hover:text-[#6F42F5]"
        }`}
      >
        הכל
      </Link>
      {categories.map((item) => (
        <Link
          key={item.slug}
          href={blogHref({ category: item.slug, q: query, sort })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeCategory === item.slug
              ? "bg-[#6F42F5] text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-[#6F42F5]/30 hover:text-[#6F42F5]"
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );
}
