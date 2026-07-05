import { hashSeed, pickCuratedPhoto, searchQueriesForCategory } from "@/lib/blog/stock-photos";

const GENERIC_FALLBACKS = new Set([
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1600&q=80",
]);

type PhotoResult = { url: string };

function pickFromResults(results: PhotoResult[], seed: string): string {
  if (!results.length) return "";
  return results[hashSeed(seed) % results.length].url;
}

async function searchUnsplash(query: string): Promise<PhotoResult[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "12");
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string } }> };
    return (data.results ?? [])
      .map((item) => item.urls?.regular)
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ url }));
  } catch {
    return [];
  }
}

async function searchPexels(query: string): Promise<PhotoResult[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "12");
    const res = await fetch(url, {
      headers: { Authorization: key },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { photos?: Array<{ src?: { large?: string } }> };
    return (data.photos ?? [])
      .map((item) => item.src?.large)
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ url }));
  } catch {
    return [];
  }
}

async function searchPixabay(query: string): Promise<PhotoResult[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", key);
    url.searchParams.set("q", query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", "horizontal");
    url.searchParams.set("per_page", "12");
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: Array<{ largeImageURL?: string }> };
    return (data.hits ?? [])
      .map((item) => item.largeImageURL)
      .filter((value): value is string => Boolean(value))
      .map((url) => ({ url }));
  } catch {
    return [];
  }
}

async function searchStockPhoto(query: string, seed: string): Promise<string> {
  const unsplash = await searchUnsplash(query);
  if (unsplash.length) return pickFromResults(unsplash, seed);
  const pexels = await searchPexels(query);
  if (pexels.length) return pickFromResults(pexels, seed);
  const pixabay = await searchPixabay(query);
  if (pixabay.length) return pickFromResults(pixabay, seed);
  return "";
}

export async function resolveEditorialImage(options: {
  category: string;
  categorySlug?: string;
  seed: string;
  existingUrl?: string;
}): Promise<string> {
  const { category, categorySlug = "", seed, existingUrl } = options;
  if (existingUrl && !GENERIC_FALLBACKS.has(existingUrl)) {
    return existingUrl;
  }

  const queries = searchQueriesForCategory(category, categorySlug);
  for (const query of queries) {
    const url = await searchStockPhoto(query, seed);
    if (url) return url;
  }

  return pickCuratedPhoto(category, categorySlug, seed);
}
