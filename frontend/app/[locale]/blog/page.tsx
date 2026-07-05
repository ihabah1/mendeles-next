import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogFeaturesSection } from "@/components/blog/features-section";
import { BlogShell } from "@/components/blog/blog-shell";
import { CategoryFilter } from "@/components/blog/category-filter";
import { HeroArticle } from "@/components/blog/hero-article";
import { NewsletterCard } from "@/components/blog/newsletter-card";
import { PopularArticles } from "@/components/blog/popular-articles";
import { SearchToolbar } from "@/components/blog/search-toolbar";
import { TrendingSidebar } from "@/components/blog/trending-sidebar";
import { resolveEditorialImage } from "@/lib/blog/resolve-editorial-image";
import type { BlogCardPost, BlogCategory, BlogSort } from "@/lib/blog/types";
import { BLOG_PAGE_SIZE, blogHref, sortPosts } from "@/lib/blog/utils";
import { backendBase } from "@/lib/api/backend-url";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string }>;
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

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstImage(page: PublicBlogPage): string {
  const config = page.blocks.find((block) => block.block_type === "image" && block.is_visible)?.config;
  return textValue(config?.url);
}

function categoryInfo(page: PublicBlogPage): { name: string; slug: string } {
  const term = page.terms.find((item) => item.taxonomy === "ai-seo-categories");
  return {
    name: term?.name || "SEO",
    slug: term?.slug || "",
  };
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

async function toCardPost(page: PublicBlogPage): Promise<BlogCardPost> {
  const category = categoryInfo(page);
  const image_url = await resolveEditorialImage({
    category: category.name,
    categorySlug: category.slug,
    seed: page.id,
    existingUrl: firstImage(page) || undefined,
  });

  return {
    id: page.id,
    title: page.title,
    full_path: page.full_path,
    meta_description: page.meta_description,
    published_at: page.published_at,
    image_url,
    category: category.name,
    category_slug: category.slug,
    reading_minutes: readingMinutes(page),
  };
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
    description: "תובנות, מדריכים ומחקר לצמיחה דיגיטלית — בלוג Mendeles Insights.",
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "", page = "1", sort = "newest" } = await searchParams;
  const feed = await fetchBlogFeed(locale, q, category);
  const cardPosts = await Promise.all(feed.results.map(toCardPost));
  const sortedPosts = sortPosts(cardPosts, (sort as BlogSort) || "newest");
  const featured = sortedPosts[0];
  const postsForGrid = featured ? sortedPosts.slice(1) : sortedPosts;
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(postsForGrid.length / BLOG_PAGE_SIZE));
  const gridPosts = postsForGrid.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);
  const categoryCounts: BlogCategory[] = feed.categories.map((item) => ({
    ...item,
    count: feed.results.filter((post) => post.terms.some((term) => term.slug === item.slug)).length || 0,
  }));

  return (
    <BlogShell categories={categoryCounts}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-10">
            {featured ? (
              <HeroArticle post={featured} />
            ) : (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-14 text-center shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                <h2 className="text-3xl font-extrabold text-slate-900">Mendeles Insights</h2>
                <p className="mt-3 text-slate-500">אין עדיין מאמרים מפורסמים להצגה.</p>
              </section>
            )}

            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900">כל המאמרים</h2>
                <span className="text-sm text-slate-500">{sortedPosts.length} במאגר</span>
              </div>

              <SearchToolbar
                categories={categoryCounts}
                query={q}
                activeCategory={category}
                sort={sort}
              />

              <CategoryFilter
                categories={categoryCounts}
                activeCategory={category}
                query={q}
                sort={sort}
              />

              {gridPosts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-sm">
                  לא נמצאו מאמרים עבור הסינון הנוכחי.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {gridPosts.map((post) => (
                    <ArticleCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {currentPage < totalPages ? (
                <div className="pt-4 text-center">
                  <Link
                    href={blogHref({ page: currentPage + 1, category, q, sort })}
                    className="inline-flex w-full max-w-lg items-center justify-center rounded-2xl border-2 border-[#6F42F5]/25 bg-white px-6 py-4 text-sm font-bold text-[#6F42F5] transition hover:border-[#6F42F5] hover:bg-[#6F42F5]/5"
                  >
                    טען עוד מאמרים
                  </Link>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <TrendingSidebar categories={categoryCounts} activeCategory={category} />
            <NewsletterCard />
            <PopularArticles posts={sortedPosts} />
          </aside>
        </div>
      </div>

      <BlogFeaturesSection />
    </BlogShell>
  );
}
