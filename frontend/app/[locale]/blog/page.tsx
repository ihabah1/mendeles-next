import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  BlogArticleCard,
  BlogMostReadPanel,
  BlogRating,
  BlogReadLink,
  type BlogCardPost,
} from "@/components/blog/blog-interactive";
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

function readingMinutes(page: PublicBlogPage): number {
  const text = [
    page.title,
    page.meta_description,
    ...page.blocks.filter((block) => block.is_visible).map((block) => JSON.stringify(block.config)),
  ].join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.min(15, Math.ceil(words / 180)));
}

function toCardPost(page: PublicBlogPage): BlogCardPost {
  return {
    id: page.id,
    title: page.title,
    full_path: page.full_path,
    meta_description: page.meta_description,
    published_at: page.published_at,
    image_url: imageUrl(page),
    category: categoryName(page),
    reading_minutes: readingMinutes(page),
  };
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
    description: "תובנות, מדריכים וכלים לצמיחה דיגיטלית — בלוג Mendeles.",
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "", page = "1" } = await searchParams;
  const feed = await fetchBlogFeed(locale, q, category);
  const cardPosts = feed.results.map(toCardPost);
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(cardPosts.length / BLOG_PAGE_SIZE));
  const visiblePosts = cardPosts.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);
  const featured = cardPosts[0];
  const categoryCounts = feed.categories.map((item) => ({
    ...item,
    count: feed.results.filter((post) => post.terms.some((term) => term.slug === item.slug)).length || 0,
  }));

  return (
    <MarketingShell>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <section className="relative mx-auto max-w-7xl px-6 pb-6 pt-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-300">Mendeles Insights</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-6xl">
                בלוג לצמיחה
                <span className="block bg-gradient-to-l from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  חכמה, SEO ואוטומציה
                </span>
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-400 md:text-lg">
                מאמרים מעשיים על שיווק דיגיטלי, בינה מלאכותית ואסטרטגיות צמיחה — עם דירוג קוראים והמלצות מובילות.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
              <div className="text-center">
                <p className="text-2xl font-black text-white">{cardPosts.length}</p>
                <p className="text-xs text-slate-400">מאמרים</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{feed.categories.length}</p>
                <p className="text-xs text-slate-400">קטגוריות</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">★</p>
                <p className="text-xs text-slate-400">דרג ודורג</p>
              </div>
            </div>
          </div>
        </section>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_320px]">
          <section className="min-w-0 space-y-8">
            {featured ? (
              <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/10 via-white/[0.04] to-cyan-500/5 p-1 shadow-2xl shadow-violet-900/20">
                <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative min-h-[280px] overflow-hidden rounded-[1.85rem] md:min-h-full">
                    <img src={featured.image_url} alt={featured.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-[#0a0e1a]/20 to-transparent md:bg-gradient-to-l" />
                  </div>
                  <div className="flex flex-col justify-center p-6 text-right md:p-8">
                    <span className="mb-4 w-fit self-end rounded-full border border-violet-400/30 bg-violet-500/20 px-4 py-1 text-xs font-bold text-violet-200">
                      מאמר מומלץ
                    </span>
                    <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">{featured.title}</h2>
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-300">{featured.meta_description}</p>
                    <div className="mt-5 flex flex-wrap items-center justify-end gap-4">
                      <BlogRating postId={featured.id} size="md" />
                      <span className="text-xs text-slate-500">
                        {featured.published_at ? new Date(featured.published_at).toLocaleDateString("he-IL") : "ללא תאריך"} · {featured.reading_minutes} דק׳
                      </span>
                    </div>
                    <BlogReadLink
                      post={featured}
                      className="mt-6 inline-flex w-fit self-end rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-90"
                    >
                      קרא עכשיו ←
                    </BlogReadLink>
                  </div>
                </div>
              </article>
            ) : (
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-12 text-center">
                <h2 className="text-3xl font-black text-white">בלוג Mendeles</h2>
                <p className="mt-3 text-slate-400">אין עדיין מאמרים מפורסמים להצגה.</p>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">הכי נקראים</h2>
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">דירוג חי</span>
              </div>
              <BlogMostReadPanel posts={cardPosts} />
            </section>

            <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur md:grid-cols-[1fr_180px_auto]">
              <input
                name="q"
                defaultValue={q}
                placeholder="חיפוש מאמרים, נושאים, מילות מפתח..."
                className="rounded-xl border border-white/10 bg-[#0a0e1a]/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <select
                name="category"
                defaultValue={category}
                className="rounded-xl border border-white/10 bg-[#0a0e1a]/60 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">כל הקטגוריות</option>
                {feed.categories.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-l from-violet-500 to-indigo-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
              >
                חפש
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/blog"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  !category ? "bg-white text-slate-950" : "border border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white"
                }`}
              >
                הכל
              </Link>
              {feed.categories.slice(0, 6).map((item) => (
                <Link
                  key={item.slug}
                  href={blogHref({ category: item.slug, q })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    category === item.slug
                      ? "bg-white text-slate-950"
                      : "border border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-white">כל המאמרים</h2>
              <span className="text-sm text-slate-500">{cardPosts.length} במאגר</span>
            </div>

            {visiblePosts.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center text-slate-400">
                לא נמצאו מאמרים עבור הסינון הנוכחי.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {visiblePosts.map((post, index) => (
                  <BlogArticleCard key={post.id} post={post} featured={index === 0 && currentPage === 1 && !q && !category} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2">
                <Link
                  href={blogHref({ page: Math.max(1, currentPage - 1), category, q })}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
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
                        pageNumber === currentPage
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                          : "border border-white/10 text-slate-300 hover:text-white"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  );
                })}
                <Link
                  href={blogHref({ page: Math.min(totalPages, currentPage + 1), category, q })}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                >
                  הבא
                </Link>
              </nav>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <h2 className="text-lg font-black text-white">קטגוריות</h2>
              <div className="mt-5 space-y-2">
                {categoryCounts.length === 0 ? (
                  <p className="text-sm text-slate-400">אין קטגוריות עדיין.</p>
                ) : (
                  categoryCounts.map((item) => (
                    <Link
                      key={item.slug}
                      href={blogHref({ category: item.slug })}
                      className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-sm text-slate-300 transition hover:border-violet-400/20 hover:bg-white/[0.04] hover:text-white"
                    >
                      <span>{item.name}</span>
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-400">{item.count}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">✦</div>
              <h2 className="mt-4 text-lg font-black text-white">קבלו עדכונים חדשים</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">מדריכים, טיפים וכלים לצמיחת האתר שלכם — ישירות לתיבה.</p>
              <form className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-white/10 bg-[#0a0e1a]/50 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="כתובת האימייל שלכם"
                />
                <button className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950" type="button">
                  הרשמו
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <h2 className="text-lg font-black text-white">למה לדרג?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                הדירוג שלכם משפיע על רשימת &quot;הכי נקראים&quot; ועוזר לנו להציג את התוכן הכי רלוונטי קודם.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </MarketingShell>
  );
}
