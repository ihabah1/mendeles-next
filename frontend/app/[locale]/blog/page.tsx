import type { Metadata } from "next";
import { Link } from "@/lib/i18n/navigation";
import { isRtlLocale } from "@/lib/i18n/locale-content";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogFeaturesSection } from "@/components/blog/features-section";
import { BlogShell } from "@/components/blog/blog-shell";
import { CategoryFilter } from "@/components/blog/category-filter";
import { DemoNotice } from "@/components/blog/demo-notice";
import { EditorialMasthead } from "@/components/blog/editorial-masthead";
import { FeaturedStrip } from "@/components/blog/featured-strip";
import { HeroArticle } from "@/components/blog/hero-article";
import { NewsletterCard } from "@/components/blog/newsletter-card";
import { PopularArticles } from "@/components/blog/popular-articles";
import { SearchToolbar } from "@/components/blog/search-toolbar";
import { SportsSection } from "@/components/blog/sports-section";
import { TrendingSidebar } from "@/components/blog/trending-sidebar";
import { ToolsMenu } from "@/components/tools/tools-menu";
import {
  filterDemoPosts,
  getEditorialDemoCategories,
  getEditorialDemoPosts,
  getSportsDemoPosts,
} from "@/lib/blog/demo-articles";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import { localizeBlogCategories, localizeBlogCategory } from "@/lib/blog/category-labels";
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

function categoryInfo(page: PublicBlogPage, locale: string): { name: string; slug: string } {
  const term = page.terms.find((item) => item.taxonomy === "ai-seo-categories");
  const slug = term?.slug || "";
  return {
    name: localizeBlogCategory(slug, locale),
    slug,
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

async function toCardPost(page: PublicBlogPage, locale: string): Promise<BlogCardPost> {
  const category = categoryInfo(page, locale);
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
  const copy = editorialCopy(locale);
  return buildPageMetadata({
    locale,
    path: "/blog",
    title: copy.metaTitle,
    description: copy.metaDescription,
  });
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "", category = "", page = "1", sort = "newest" } = await searchParams;
  const copy = editorialCopy(locale);
  const feed = await fetchBlogFeed(locale, q, category);
  const usingDemo = feed.results.length === 0;

  const cardPosts = usingDemo
    ? filterDemoPosts(getEditorialDemoPosts(locale), { q, category })
    : await Promise.all(feed.results.map((page) => toCardPost(page, locale)));

  const sortedPosts = sortPosts(cardPosts, (sort as BlogSort) || "newest", locale);
  const sportsPosts = usingDemo
    ? getSportsDemoPosts(locale)
    : sortedPosts.filter((post) => post.category_slug === "sports");
  const featured = sortedPosts[0];
  const secondaryFeatured = sortedPosts.slice(1, 4);
  const usedIds = new Set([featured?.id, ...secondaryFeatured.map((post) => post.id)].filter(Boolean));
  const postsForGrid = sortedPosts.filter((post) => !usedIds.has(post.id));
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.max(1, Math.ceil(postsForGrid.length / BLOG_PAGE_SIZE));
  const gridPosts = postsForGrid.slice((currentPage - 1) * BLOG_PAGE_SIZE, currentPage * BLOG_PAGE_SIZE);

  const categoryCounts: BlogCategory[] = usingDemo
    ? getEditorialDemoCategories(locale)
    : localizeBlogCategories(
        feed.categories.map((item) => ({
          ...item,
          count: feed.results.filter((post) => post.terms.some((term) => term.slug === item.slug)).length || 0,
        })),
        locale,
      );

  return (
    <BlogShell categories={categoryCounts} previewPosts={usingDemo ? getEditorialDemoPosts(locale) : []} locale={locale} editable={!usingDemo}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {usingDemo ? <DemoNotice locale={locale} /> : null}

        <EditorialMasthead locale={locale} />

        <div className="mt-6">
          <ToolsMenu locale={locale} />
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_minmax(280px,320px)]">
          <div className="min-w-0 space-y-8">
            {featured ? <HeroArticle post={featured} locale={locale} /> : null}
            {secondaryFeatured.length > 0 ? <FeaturedStrip posts={secondaryFeatured} locale={locale} /> : null}

            <section id="blog-search" className="space-y-6 scroll-mt-28">
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 ${
                  isRtlLocale(locale) ? "text-right" : "text-left"
                }`}
              >
                <h2 className="text-2xl font-extrabold text-slate-900">{copy.allArticles}</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500 shadow-sm">
                  {sortedPosts.length} {copy.inArchive}
                </span>
              </div>

              <SearchToolbar categories={categoryCounts} query={q} activeCategory={category} sort={sort} locale={locale} />
              <CategoryFilter categories={categoryCounts} activeCategory={category} query={q} sort={sort} locale={locale} />

              {category !== "sports" && sportsPosts.length > 0 ? (
                <SportsSection posts={sportsPosts} locale={locale} />
              ) : null}

              {gridPosts.length === 0 ? (
                <div className="rounded-2xl bg-white p-12 text-center text-slate-500 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                  {copy.noResults}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {gridPosts.map((post) => (
                    <ArticleCard key={post.id} post={post} locale={locale} />
                  ))}
                </div>
              )}

              {currentPage < totalPages ? (
                <div className="pt-4 text-center">
                  <Link
                    href={blogHref({ page: currentPage + 1, category, q, sort })}
                    className="inline-flex w-full max-w-lg items-center justify-center rounded-2xl border-2 border-[#6F42F5]/25 bg-white px-6 py-4 text-sm font-bold text-[#6F42F5] transition hover:border-[#6F42F5] hover:bg-[#6F42F5]/5"
                  >
                    {copy.loadMore}
                  </Link>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <TrendingSidebar categories={categoryCounts} activeCategory={category} locale={locale} />
            <NewsletterCard locale={locale} />
            <PopularArticles posts={sortedPosts} locale={locale} />
          </aside>
        </div>
      </div>

      <BlogFeaturesSection locale={locale} />
    </BlogShell>
  );
}
