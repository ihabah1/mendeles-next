import { ArticleCard } from "@/components/blog/article-card";
import { Link } from "@/lib/i18n/navigation";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCardPost } from "@/lib/blog/types";

type Props = {
  posts: BlogCardPost[];
  locale: string;
};

export function SportsSection({ posts, locale }: Props) {
  if (!posts.length) return null;
  const copy = editorialCopy(locale);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border-2 border-red-600/20 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-red-600 bg-slate-950 px-6 py-4 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400">{copy.breaking}</p>
          <h2 className="mt-1 text-2xl font-extrabold">{copy.sportsDesk}</h2>
          <p className="mt-1 text-sm text-slate-300">{copy.sportsSubtitle}</p>
        </div>
        <Link
          href="/blog?category=sports"
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500"
        >
          {locale === "en" ? "All sports" : "כל הספורט"}
        </Link>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} locale={locale} variant="sports" />
        ))}
      </div>
    </section>
  );
}
