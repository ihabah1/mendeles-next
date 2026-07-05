import type { BlogCardPost, BlogSort } from "@/lib/blog/types";

export const BLOG_ACCENT = "#6F42F5";
export const BLOG_PAGE_SIZE = 9;

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
}): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

export function formatPublishDate(value: string | null, locale = "he-IL"): string {
  if (!value) return "ללא תאריך";
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function sortPosts(posts: BlogCardPost[], sort: BlogSort): BlogCardPost[] {
  const copy = [...posts];
  if (sort === "oldest") {
    return copy.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateA - dateB;
    });
  }
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, "he"));
  }
  return copy.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });
}
