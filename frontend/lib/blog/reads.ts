const READS_KEY = "mendeles-blog-reads";
const BOOKMARKS_KEY = "mendeles-blog-bookmarks";

export function readCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(READS_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function trackBlogRead(postId: string) {
  if (typeof window === "undefined") return;
  const counts = readCounts();
  counts[postId] = (counts[postId] || 0) + 1;
  window.localStorage.setItem(READS_KEY, JSON.stringify(counts));
}

export function bookmarkedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(window.localStorage.getItem(BOOKMARKS_KEY) || "[]") as string[];
    return new Set(raw);
  } catch {
    return new Set();
  }
}

export function toggleBookmark(postId: string): boolean {
  if (typeof window === "undefined") return false;
  const ids = bookmarkedIds();
  if (ids.has(postId)) ids.delete(postId);
  else ids.add(postId);
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...ids]));
  return ids.has(postId);
}
