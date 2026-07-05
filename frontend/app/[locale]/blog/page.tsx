import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { BlogShell } from "@/components/blog/blog-shell";
import { BlogFeaturesSection } from "@/components/blog/blog-features-section";
import { BlogHeroCarousel } from "@/components/blog/blog-hero-carousel";
import {
  BlogArticleCard,
  BlogNewsletterCard,
  BlogTopArticlesPanel,
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

const BLOG_PAGE_SIZE = 9;
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
  return page.terms.find((term) => term.taxonomy === "ai-seo-categories")?.name || "SEO";
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
    title: "Mendeles Insights — בלוג",
    description: "תובנות, מדריכים וכלים לצמיחה דיגיטלית — בלוג Mendeles Insights.",
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "", page = "1" } = await searchParams;
  const feed = await fetchBlogFeed(locale, q, category);
  const cardPosts = feed.results.map(toCardPost);
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(cardPosts.length / BLOG_PAGE_SIZE));
  const gridPosts = cardPosts.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);
  const categoryCounts = feed.categories.map((item) => ({
    ...item,
    count: feed.results.filter((post) => post.terms.some((term) => term.slug === item.slug)).length || 0,
  }));

  return (
    <BlogShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-8">
            {cardPosts.length > 0 ? (
              <BlogHeroCarousel posts={cardPosts} />
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Mendeles Insights</h2>
                <p className="mt-3 text-slate-500">אין עדיין מאמרים מפורסמים להצגה.</p>
              </section>
            )}

            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">כל המאמרים</h2>
                <span className="text-sm text-slate-500">{cardPosts.length} במאגר</span>
              </div>

              <form id="blog-search" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <button
                  type="submit"
                  className="order-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-[#5e35b1]/30 hover:text-[#5e35b1] lg:order-1"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                  </svg>
                  סינון מתקדם
                </button>
                <select
                  name="category"
                  defaultValue={category}
                  className="order-2 min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#5e35b1]/40 lg:max-w-[200px]"
                >
                  <option value="">כל הקטגוריות</option>
                  {feed.categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <div className="relative order-1 min-w-[200px] flex-1 lg:order-3">
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="חיפוש מאמרים..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pe-10 ps-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5e35b1]/40"
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
                <button
                  type="submit"
                  className="order-4 rounded-lg bg-[#5e35b1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a2a9c]"
                >
                  חפש
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={blogHref({ q })}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    !category ? "bg-[#5e35b1] text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-[#5e35b1]/30"
                  }`}
                >
                  הכל
                </Link>
                {feed.categories.map((item) => (
                  <Link
                    key={item.slug}
                    href={blogHref({ category: item.slug, q })}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      category === item.slug
                        ? "bg-[#5e35b1] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#5e35b1]/30"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {gridPosts.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                  לא נמצאו מאמרים עבור הסינון הנוכחי.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {gridPosts.map((post) => (
                    <BlogArticleCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {currentPage < totalPages ? (
                <div className="pt-2 text-center">
                  <Link
                    href={blogHref({ page: currentPage + 1, category, q })}
                    className="inline-flex w-full max-w-md items-center justify-center rounded-xl border-2 border-[#5e35b1]/30 bg-white px-6 py-3 text-sm font-bold text-[#5e35b1] transition hover:border-[#5e35b1] hover:bg-[#5e35b1]/5"
                  >
                    טען עוד מאמרים
                  </Link>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">נושאים פופולריים</h2>
              <div className="mt-4 space-y-1">
                {categoryCounts.length === 0 ? (
                  <p className="text-sm text-slate-500">אין קטגוריות עדיין.</p>
                ) : (
                  categoryCounts.slice(0, 8).map((item) => (
                    <Link
                      key={item.slug}
                      href={blogHref({ category: item.slug })}
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-[#5e35b1]"
                    >
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{item.count}</span>
                      <span>{item.name}</span>
                    </Link>
                  ))
                )}
              </div>
              {categoryCounts.length > 0 ? (
                <Link href="/blog" className="mt-3 block text-center text-sm font-medium text-[#5e35b1] hover:underline">
                  הצג את כל הנושאים
                </Link>
              ) : null}
            </section>

            <BlogNewsletterCard />

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">המאמרים המובילים</h2>
              <div className="mt-4">
                <BlogTopArticlesPanel posts={cardPosts} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <BlogFeaturesSection />
    </BlogShell>
  );
}
