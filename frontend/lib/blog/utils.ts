import type { BlogCardPost, BlogSort } from "@/lib/blog/types";
import { dateLocale, sortLocale } from "@/lib/blog/editorial-copy";
import { pickHeEn } from "@/lib/i18n/locale-content";

export const BLOG_ACCENT = "#6F42F5";
export const BLOG_PAGE_SIZE = 9;

export type BlogLinkHref = {
  pathname: "/blog";
  query?: Record<string, string>;
};

/** next-intl Link href — query must be a separate object, not embedded in the pathname string. */
export function blogHref({
  page,
  category,
  q,
  sort,
}: {
  page?: number;
  category?: string;
  q?: string;
  sort?: string;
} = {}): BlogLinkHref {
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (category) query.category = category;
  if (sort && sort !== "newest") query.sort = sort;
  if (page && page > 1) query.page = String(page);
  if (Object.keys(query).length === 0) return { pathname: "/blog" };
  return { pathname: "/blog", query };
}

export function formatPublishDate(value: string | null, locale = "he"): string {
  if (!value) return pickHeEn(locale, "ללא תאריך", "No date");
  return new Date(value).toLocaleDateString(dateLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function sortPosts(posts: BlogCardPost[], sort: BlogSort, locale = "he"): BlogCardPost[] {
  const copy = [...posts];
  if (sort === "oldest") {
    return copy.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateA - dateB;
    });
  }
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, sortLocale(locale)));
  }
  return copy.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });
}
