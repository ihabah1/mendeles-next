import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCategory } from "@/lib/blog/types";

type Props = {
  categories: BlogCategory[];
  query?: string;
  activeCategory?: string;
  sort?: string;
  locale?: string;
};

export function SearchToolbar({
  categories,
  query = "",
  activeCategory = "",
  sort = "newest",
  locale = "he",
}: Props) {
  const copy = editorialCopy(locale);

  return (
    <form
      id="blog-search"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <input
          name="q"
          defaultValue={query}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-[#F7F8FC] py-3 pe-11 ps-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900/30 focus:bg-white"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      <select
        name="category"
        defaultValue={activeCategory}
        className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-900/30"
      >
        <option value="">{copy.allCategories}</option>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>

      <select
        name="sort"
        defaultValue={sort}
        className="min-w-[160px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-900/30"
      >
        <option value="newest">{copy.sortNewest}</option>
        <option value="oldest">{copy.sortOldest}</option>
        <option value="title">{copy.sortTitle}</option>
      </select>

      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        {copy.searchButton}
      </button>
    </form>
  );
}
