import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { backendBase } from "@/lib/api/backend-url";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

type PublicBlock = {
  block_type: string;
  config: Record<string, unknown>;
  is_visible: boolean;
};

type PublicBlogPage = {
  id: string;
  title: string;
  full_path: string;
  meta_description: string;
  published_at: string | null;
  blocks: PublicBlock[];
  terms: Array<{ name: string; slug: string; taxonomy: string }>;
};

type BlogFeed = {
  results: PublicBlogPage[];
  categories: Array<{ slug: string; name: string }>;
};

const BLOG_PAGE_SIZE = 6;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80";

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstImage(page: PublicBlogPage): Record<string, unknown> | null {
  return page.blocks.find((block) => block.block_type === "image" && block.is_visible)?.config ?? null;
}

function imageUrl(page: PublicBlogPage): string {
  return textValue(firstImage(page)?.url) || FALLBACK_IMAGE;
}

function categoryName(page: PublicBlogPage): string {
  return page.terms.find((term) => term.taxonomy === "ai-seo-categories")?.name || "אסטרטגיית SEO";
}

function formatDate(value: string | null): string {
  if (!value) return "ללא תאריך";
  return new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

function blogHref({ page, category, q }: { page?: number; category?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

async function fetchBlogFeed(locale: string, q = "", category = ""): Promise<BlogFeed> {
  const url = new URL("/api/v1/content/public/pages/", backendBase());
  url.searchParams.set("page_type", "blog");
  url.searchParams.set("locale", locale);
  if (q) url.searchParams.set("q", q);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { results: [], categories: [] };
  return (await res.json()) as BlogFeed;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/blog",
    title: "בלוג Mendeles",
    description: "מאמרים שפורסמו מתוך אוטומציית AI SEO של Mendeles.",
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "", page = "1" } = await searchParams;
  const feed = await fetchBlogFeed(locale, q, category);
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(feed.results.length / BLOG_PAGE_SIZE));
  const visiblePosts = feed.results.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);
  const featured = feed.results[0];
  const popular = feed.results.slice(0, 3);
  const categoryCounts = feed.categories.map((item) => ({
    ...item,
    count: feed.results.filter((post) => post.terms.some((term) => term.slug === item.slug)).length || 0,
  }));

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">M</span>
            <Link href="/" className="text-xl font-bold">Mendeles</Link>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <Link href="/solutions" className="hover:text-violet-600">פתרונות</Link>
            <Link href="/industries" className="hover:text-violet-600">תעשיות</Link>
            <Link href="/blog" className="border-b-2 border-violet-600 pb-1 text-violet-600">בלוג</Link>
            <Link href="/company" className="hover:text-violet-600">חברה</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">התחברות</Link>
            <Link href="/register" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-200">הרשמה</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          {featured ? (
            <article className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[0.95fr_1.05fr]">
              <img src={imageUrl(featured)} alt={featured.title} className="h-72 w-full rounded-2xl object-cover md:h-full" />
              <div className="flex flex-col justify-center p-6 text-right">
                <span className="mb-4 w-fit self-end rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">מאמר מוביל</span>
                <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">{featured.title}</h1>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-500">{featured.meta_description}</p>
                <div className="mt-5 flex flex-wrap items-center justify-end gap-4 text-xs text-slate-400">
                  <span>מאת Mendeles</span>
                  <span>{formatDate(featured.published_at)}</span>
                  <span>7 דקות קריאה</span>
                </div>
              </div>
            </article>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <h1 className="text-3xl font-black">בלוג Mendeles</h1>
              <p className="mt-3 text-slate-500">אין עדיין מאמרים מפורסמים להצגה.</p>
            </section>
          )}

          <form className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[auto_180px_1fr]">
            <button type="submit" className="rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-100">
              חפש
            </button>
            <select
              name="category"
              defaultValue={category}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
            >
              <option value="">כל הקטגוריות</option>
              {feed.categories.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
            <input
              name="q"
              defaultValue={q}
              placeholder="חיפוש מאמרים..."
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
            />
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <Link href="/blog" className={`rounded-xl px-4 py-2 font-semibold ${!category ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
              הכל
            </Link>
            {feed.categories.slice(0, 5).map((item) => (
              <Link
                key={item.slug}
                href={blogHref({ category: item.slug, q })}
                className={`rounded-xl px-4 py-2 font-semibold ${category === item.slug ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">כל המאמרים</h2>
            <span className="text-sm text-slate-400">{feed.results.length} מאמרים</span>
          </div>

          {visiblePosts.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              לא נמצאו מאמרים עבור הסינון הנוכחי.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative">
                    <img src={imageUrl(post)} alt={post.title} className="h-44 w-full object-cover" />
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700">
                      {categoryName(post)}
                    </span>
                  </div>
                  <div className="p-5 text-right">
                    <h3 className="line-clamp-2 text-lg font-black leading-7">{post.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{post.meta_description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <span>6 דקות קריאה</span>
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                    <Link href={post.full_path} className="mt-4 inline-flex text-sm font-bold text-violet-600">
                      קרא מאמר ←
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2">
              <Link
                href={blogHref({ page: Math.max(1, currentPage - 1), category, q })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
              >
                הקודם
              </Link>
              {Array.from({ length: totalPages }).slice(0, 6).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <Link
                    key={pageNumber}
                    href={blogHref({ page: pageNumber, category, q })}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                      pageNumber === currentPage ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                );
              })}
              <Link
                href={blogHref({ page: Math.min(totalPages, currentPage + 1), category, q })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
              >
                הבא
              </Link>
            </nav>
          )}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">קטגוריות</h2>
            <div className="mt-5 space-y-3">
              {categoryCounts.length === 0 ? (
                <p className="text-sm text-slate-500">אין קטגוריות עדיין.</p>
              ) : (
                categoryCounts.map((item) => (
                  <Link key={item.slug} href={blogHref({ category: item.slug })} className="flex items-center justify-between rounded-xl p-2 text-sm hover:bg-slate-50">
                    <span>{item.name}</span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">{item.count}</span>
                  </Link>
                ))
              )}
            </div>
            <Link href="/blog" className="mt-4 inline-flex text-sm font-bold text-violet-600">הצג את כל הקטגוריות ←</Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-2xl text-violet-600">✦</div>
            <h2 className="mt-4 text-lg font-black">קבלו עדכונים חדשים</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">מדריכים, טיפים וכלים לצמיחת האתר שלכם.</p>
            <form className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none" placeholder="כתובת האימייל שלכם" />
              <button className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white" type="button">הרשמו</button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">המאמרים הפופולריים</h2>
            <div className="mt-5 space-y-4">
              {popular.map((post, index) => (
                <Link key={post.id} href={post.full_path} className="flex gap-3 rounded-xl p-2 hover:bg-slate-50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm font-black text-violet-600">{index + 1}</span>
                  <img src={imageUrl(post)} alt={post.title} className="h-12 w-14 rounded-lg object-cover" />
                  <span className="line-clamp-2 text-sm font-bold leading-5 text-slate-700">{post.title}</span>
                </Link>
              ))}
            </div>
            <Link href="/blog" className="mt-4 inline-flex text-sm font-bold text-violet-600">צפה בכל המאמרים הפופולריים ←</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
